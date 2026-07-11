import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Product, ProductSale, Payment, ExpenseCategory, Expense, User } from '../../models';
import { RazorpayService } from '../../shared/razorpay.service';
import { LedgerService } from '../../shared/ledger.service';
import { NotificationService } from '../../shared/notification.service';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';

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
    @InjectModel(Product) private readonly product: typeof Product,
    @InjectModel(ProductSale) private readonly productSale: typeof ProductSale,
    @InjectModel(Payment) private readonly payment: typeof Payment,
    @InjectModel(ExpenseCategory) private readonly expenseCategory: typeof ExpenseCategory,
    @InjectModel(Expense) private readonly expense: typeof Expense,
    @InjectModel(User) private readonly user: typeof User,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly razorpay: RazorpayService,
    private readonly ledger: LedgerService,
    private readonly notificationService: NotificationService,
  ) {}

  async listProducts(shopId: string, query: any) {
    const { category } = query;
    const where: any = { shop_id: shopId, is_active: true };
    if (category) where.category = category;
    return this.product.findAll({ where, order: [['name', 'ASC']] });
  }

  async createOrder(shopId: string, body: any) {
    const items = normalizeItems(body.items);

    let total = 0;
    const resolved: any[] = [];
    for (const { productId, qty } of items) {
      const product: any = await this.product.findOne({ where: { id: productId, shop_id: shopId, is_active: true } });
      if (!product) throw new AppError(`Product ${productId} not found`, 404);
      if (product.stock_qty < qty) throw new AppError(`Only ${product.stock_qty} left of ${product.name}`, 400);
      total += parseFloat(product.sell_price) * qty;
      resolved.push({ product, qty });
    }

    const order = await this.razorpay.createOrder(total, 'INR');

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

  async purchase(shopId: string, userId: string, body: any) {
    const t: any = await this.sequelize.transaction();
    try {
      const items = normalizeItems(body.items);
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        throw new AppError('Payment verification details missing', 400);
      }
      const valid = this.razorpay.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (!valid) throw new AppError('Payment verification failed', 400);

      const saleDate = new Date().toISOString().split('T')[0];
      const lines: any[] = [];
      let total = 0;

      for (const { productId, qty } of items) {
        const product: any = await this.product.findOne({
          where: { id: productId, shop_id: shopId, is_active: true },
          transaction: t, lock: t.LOCK.UPDATE,
        });
        if (!product) throw new AppError(`Product ${productId} not found`, 404);
        if (product.stock_qty < qty) throw new AppError(`Only ${product.stock_qty} left of ${product.name}`, 400);

        const total_price = parseFloat(product.sell_price) * qty;
        total += total_price;

        const sale: any = await this.productSale.create({
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
        } as any, { transaction: t });

        await product.update({ stock_qty: product.stock_qty - qty }, { transaction: t });
        lines.push({ sale, product, qty });
      }

      const anchorSaleId = lines[0].sale.id;
      const itemsDesc = lines.map(({ product, qty }) => `${product.name} × ${qty}`).join(', ');

      await this.payment.create({
        shop_id: shopId,
        member_id: userId,
        product_sale_id: anchorSaleId,
        amount: total,
        payment_date: saleDate,
        payment_method: 'razorpay',
      } as any, { transaction: t });

      await this.ledger.record({
        shopId,
        type: 'credit',
        amount: total,
        reference: 'sale',
        referenceId: anchorSaleId,
        entryDate: saleDate,
        transaction: t,
      });

      const [productSellCategory]: any = await this.expenseCategory.findOrCreate({
        where: { shop_id: shopId, name: 'Product Sell', type: 'credit' },
        defaults: { shop_id: shopId, name: 'Product Sell', type: 'credit' } as any,
        transaction: t,
      });
      const buyer: any = await this.user.findByPk(userId, { attributes: ['first_name', 'last_name'], transaction: t });
      await this.expense.create({
        shop_id: shopId,
        category_id: productSellCategory.id,
        description: itemsDesc,
        amount: total,
        expense_date: saleDate,
        paid_to: buyer ? `${buyer.first_name} ${buyer.last_name}`.trim() : null,
        product_sale_id: anchorSaleId,
      } as any, { transaction: t });

      await t.commit();

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
    } catch (err) {
      if (!t.finished) await t.rollback();
      throw err;
    }
  }

  async myOrders(shopId: string, userId: string) {
    const sales: any[] = await this.productSale.findAll({
      where: { shop_id: shopId, member_id: userId },
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'photo_url', 'category'] }],
      order: [['created_at', 'DESC']],
    });

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
