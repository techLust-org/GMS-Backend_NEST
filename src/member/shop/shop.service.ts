import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Product, ProductSale, Payment, ExpenseCategory, Expense, User, PendingPayment } from '../../models';
import { RazorpayService } from '../../shared/razorpay.service';
import { LedgerService } from '../../shared/ledger.service';
import { NotificationService } from '../../shared/notification.service';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';
import { withTransaction, isUniqueViolation } from '../../database/db-utils';

function normalizeItems(rawItems: any) {
  const items = Array.isArray(rawItems) ? rawItems : null;
  if (!items || items.length === 0) throw new AppError('Cart is empty', 400);
  return items.map(({ productId, quantity }) => {
    const qty = parseInt(quantity);
    if (!productId || !qty || qty < 1) throw new AppError('Each cart item needs a productId and quantity ≥ 1', 400);
    return { productId, qty };
  });
}

@Injectable()
export class MemberShopService {
  constructor(
    @InjectModel(Product.name) private readonly product: Model<any>,
    @InjectModel(ProductSale.name) private readonly productSale: Model<any>,
    @InjectModel(Payment.name) private readonly payment: Model<any>,
    @InjectModel(ExpenseCategory.name) private readonly expenseCategory: Model<any>,
    @InjectModel(Expense.name) private readonly expense: Model<any>,
    @InjectModel(User.name) private readonly user: Model<any>,
    @InjectModel(PendingPayment.name) private readonly pendingPayment: Model<any>,
    @InjectConnection() private readonly connection: Connection,
    private readonly razorpay: RazorpayService,
    private readonly ledger: LedgerService,
    private readonly notificationService: NotificationService,
  ) {}

  async listProducts(shopId: string, query: any) {
    const { category } = query;
    const where: any = { shop_id: shopId, is_active: true };
    if (category) where.category = category;
    return this.product.find(where).sort({ name: 1 });
  }

  async createOrder(shopId: string, userId: string, body: any) {
    const items = normalizeItems(body.items);

    let total = 0;
    const resolved: any[] = [];
    for (const { productId, qty } of items) {
      const product: any = await this.product.findOne({ _id: productId, shop_id: shopId, is_active: true });
      if (!product) throw new AppError(`Product ${productId} not found`, 404);
      if (product.stock_qty < qty) throw new AppError(`Only ${product.stock_qty} left of ${product.name}`, 400);
      total += parseFloat(product.sell_price) * qty;
      resolved.push({ product, qty });
    }

    const order = await this.razorpay.createOrder(total, 'INR');

    // Remembers what this order was actually created for (exact cart +
    // total) — purchase() must read the grant back from here, never trust
    // client-resubmitted items/quantities at confirm time (a signature only
    // proves *a* payment is genuine, not that it matches what's being
    // confirmed — a client could otherwise pay for one cheap item and then
    // "confirm" a completely different, expensive cart with the same proof).
    await this.pendingPayment.create({
      shop_id: shopId,
      user_id: userId,
      kind: 'shop_order',
      razorpay_order_id: order.id,
      amount: total,
      payload: { items: items.map(({ productId, qty }) => ({ productId, qty })) },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      total,
      items: resolved.map(({ product, qty }) => ({
        productId: product.id, name: product.name, quantity: qty, unitPrice: product.sell_price,
      })),
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  // Reconstructs the "Purchase successful" response shape from already-
  // persisted sale rows — used by the idempotent-retry paths below so a
  // repeated request for an already-processed order returns the same
  // result instead of reprocessing (double-decrementing stock, double
  // crediting the ledger, etc.).
  private async existingPurchaseResult(shopId: string, razorpayOrderId: string) {
    const sales: any[] = await this.productSale
      .find({ shop_id: shopId, order_id: razorpayOrderId })
      .populate({ path: 'product', select: 'name -_id' });
    if (!sales.length) return null;
    const total = sales.reduce((sum, s) => sum + parseFloat(s.total_price), 0);
    return new ApiPayload({
      orderId: razorpayOrderId,
      status: sales[0].status,
      total,
      items: sales.map((s) => ({
        id: s.id,
        productName: s.product ? s.product.name : 'Product',
        quantity: s.quantity,
        unitPrice: s.unit_price,
        totalPrice: s.total_price,
      })),
    }, 'Purchase successful');
  }

  async purchase(shopId: string, userId: string, body: any) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new AppError('Payment verification details missing', 400);
    }
    const valid = this.razorpay.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!valid) throw new AppError('Payment verification failed', 400);

    // Idempotency: a retried request for an order we've already processed
    // (dropped response, double-tap, etc.) must return the same result,
    // not decrement stock / credit the ledger a second time.
    const already = await this.existingPurchaseResult(shopId, razorpayOrderId);
    if (already) return already;

    // The cart to fulfill comes from what createOrder() resolved and stored
    // server-side for this exact order — not from the client body.
    const pending: any = await this.pendingPayment.findOne({
      razorpay_order_id: razorpayOrderId,
      shop_id: shopId,
      user_id: userId,
      kind: 'shop_order',
    });
    if (!pending) throw new AppError('No matching order found for this payment', 400);
    if (pending.consumed_at) throw new AppError('This payment has already been processed', 409);

    // Already normalized (and server-generated) when createOrder() stored
    // it — no need to re-validate client-shaped input here.
    const items: { productId: string; qty: number }[] = pending.payload.items;

    try {
      // Concurrent purchases of the same product both write its stock_qty,
      // so MongoDB serializes them (the loser's transaction retries against
      // the updated stock) — what SELECT ... FOR UPDATE did in Postgres.
      const { lines, total, anchorSaleId, itemsDesc } = await withTransaction(this.connection, async (session) => {
        const saleDate = new Date().toISOString().split('T')[0];
        const lines: any[] = [];
        let total = 0;

        for (const { productId, qty } of items) {
          const product: any = await this.product
            .findOne({ _id: productId, shop_id: shopId, is_active: true })
            .session(session);
          if (!product) throw new AppError(`Product ${productId} not found`, 404);
          if (product.stock_qty < qty) throw new AppError(`Only ${product.stock_qty} left of ${product.name}`, 400);

          const total_price = parseFloat(product.sell_price) * qty;
          total += total_price;

          const sale: any = await new this.productSale({
            shop_id: shopId,
            product_id: product.id,
            member_id: userId,
            quantity: qty,
            unit_price: product.sell_price,
            total_price,
            order_mode: 'online',
            payment_mode: 'razorpay',
            transaction_id: razorpayPaymentId,
            order_id: razorpayOrderId,
            sold_by: userId,
            sale_date: saleDate,
            status: 'pending',
          }).save({ session });

          await product.set({ stock_qty: product.stock_qty - qty }).save({ session });
          lines.push({ sale, product, qty });
        }

        const anchorSaleId = lines[0].sale.id;
        const itemsDesc = lines.map(({ product, qty }) => `${product.name} × ${qty}`).join(', ');

        await new this.payment({
          shop_id: shopId,
          member_id: userId,
          product_sale_id: anchorSaleId,
          amount: total,
          payment_date: saleDate,
          payment_method: 'razorpay',
        }).save({ session });

        await this.ledger.record({
          shopId,
          type: 'credit',
          amount: total,
          reference: 'sale',
          referenceId: anchorSaleId,
          entryDate: saleDate,
          session,
        });

        const productSellCategory: any = await this.expenseCategory.findOneAndUpdate(
          { shop_id: shopId, name: 'Product Sell', type: 'credit' },
          { $setOnInsert: { shop_id: shopId, name: 'Product Sell', type: 'credit' } },
          { upsert: true, new: true, session },
        );
        const buyer: any = await this.user.findById(userId).select('first_name last_name').session(session);
        await new this.expense({
          shop_id: shopId,
          category_id: productSellCategory.id,
          description: itemsDesc,
          amount: total,
          expense_date: saleDate,
          paid_to: buyer ? `${buyer.first_name} ${buyer.last_name}`.trim() : null,
          product_sale_id: anchorSaleId,
        }).save({ session });

        await pending.set({ consumed_at: new Date() }).save({ session });

        return { lines, total, anchorSaleId, itemsDesc };
      });

      try {
        await this.notificationService.createNotification({
          userId,
          shopId,
          type: 'order_placed',
          title: 'Order Placed',
          message: `Your order (${itemsDesc}) has been placed and is being processed.`,
          relatedId: anchorSaleId,
        });
      } catch (notifyErr) {
        // eslint-disable-next-line no-console
        console.error('Failed to send order_placed notification:', notifyErr);
      }

      return new ApiPayload({
        orderId: razorpayOrderId,
        status: 'pending',
        total,
        items: lines.map(({ sale, product, qty }) => ({
          id: sale.id, productName: product.name, quantity: qty,
          unitPrice: sale.unit_price, totalPrice: sale.total_price,
        })),
      }, 'Purchase successful');
    } catch (err: any) {
      // Lost a race to a concurrent request processing the same order —
      // the unique index on (order_id, product_id) caught it.
      if (isUniqueViolation(err)) {
        const existing = await this.existingPurchaseResult(shopId, razorpayOrderId);
        if (existing) return existing;
      }
      throw err;
    }
  }

  async myOrders(shopId: string, userId: string) {
    const sales: any[] = await this.productSale
      .find({ shop_id: shopId, member_id: userId })
      .populate({ path: 'product', select: 'name photo_url category' })
      .sort({ createdAt: -1 });

    const groups = new Map<string, any>();
    for (const sale of sales) {
      const key = sale.order_id || `sale-${sale.id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          orderKey: key,
          status: sale.status,
          orderMode: sale.order_mode,
          paymentMode: sale.payment_mode,
          saleDate: sale.sale_date,
          createdAt: sale.createdAt,
          total: 0,
          items: [],
        });
      }
      const group = groups.get(key);
      group.total += parseFloat(sale.total_price);
      group.items.push({
        id: sale.id,
        productId: sale.product_id,
        productName: sale.product ? sale.product.name : 'Product',
        photoUrl: sale.product ? sale.product.photo_url : null,
        quantity: sale.quantity,
        unitPrice: sale.unit_price,
        totalPrice: sale.total_price,
      });
    }

    return Array.from(groups.values());
  }
}
