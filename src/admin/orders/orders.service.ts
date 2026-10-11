import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection, Model } from 'mongoose';
import { ProductSale, Expense } from '../../models';
import { LedgerService } from '../../shared/ledger.service';
import { RazorpayService } from '../../shared/razorpay.service';
import { NotificationService } from '../../shared/notification.service';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';
import { withTransaction } from '../../database/db-utils';

// A cart checkout creates several ProductSale rows sharing one Razorpay
// order_id; a single/offline sale has no order_id and is its own group.
const keyFor = (sale: any) => sale.order_id || `sale-${sale.id}`;

function groupSales(sales: any[]) {
  const groups = new Map<string, any>();
  for (const sale of sales) {
    const key = keyFor(sale);
    if (!groups.has(key)) {
      groups.set(key, {
        orderKey: key,
        status: sale.status,
        orderMode: sale.order_mode,
        paymentMode: sale.payment_mode,
        transactionId: sale.transaction_id,
        saleDate: sale.sale_date,
        createdAt: sale.createdAt,
        buyer: sale.buyer ? {
          id: sale.buyer.id,
          name: `${sale.buyer.first_name} ${sale.buyer.last_name}`.trim(),
          email: sale.buyer.email,
        } : null,
        total: 0,
        items: [],
        saleIds: [],
      });
    }
    const group = groups.get(key);
    group.total += parseFloat(sale.total_price);
    group.saleIds.push(sale.id);
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

const TRANSITIONS: Record<string, string[]> = {
  pending: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(ProductSale.name) private readonly productSale: Model<any>,
    @InjectModel(Expense.name) private readonly expense: Model<any>,
    @InjectConnection() private readonly connection: Connection,
    private readonly ledger: LedgerService,
    private readonly razorpay: RazorpayService,
    private readonly notificationService: NotificationService,
  ) {}

  private loadOrderRows(shopId: string, orderKey: string, session?: ClientSession) {
    const where: any = { shop_id: shopId };
    if (orderKey.startsWith('sale-')) {
      where._id = orderKey.slice(5);
    } else {
      where.order_id = orderKey;
    }
    return this.productSale
      .find(where)
      .populate([
        { path: 'product' },
        { path: 'buyer', select: 'first_name last_name email' },
      ])
      .session(session ?? null);
  }

  async list(shopId: string, query: any) {
    const { status, page = 1, limit = 10 } = query;
    const sales: any[] = await this.productSale
      .find({ shop_id: shopId })
      .populate([
        { path: 'product', select: 'name photo_url category' },
        { path: 'buyer', select: 'first_name last_name email' },
      ])
      .sort({ createdAt: -1 });
    let groups = groupSales(sales);
    if (status) groups = groups.filter((g) => g.status === status);

    // Orders are groups of ProductSale rows sharing an order_id, so pagination
    // is applied after grouping rather than at the SQL row level.
    const total = groups.length;
    const offset = (page - 1) * limit;
    const rows = groups.slice(offset, offset + Number(limit));
    return new ApiPayload(rows, 'Orders fetched', { total, page: +page, limit: +limit });
  }

  async updateStatus(shopId: string, orderKey: string, body: any) {
    const { status: nextStatus } = body;
    if (!['shipped', 'delivered', 'cancelled'].includes(nextStatus)) {
      throw new AppError('status must be one of: shipped, delivered, cancelled', 400);
    }

    // The Razorpay refund is an external side effect, so it runs once, after
    // the stock/ledger changes commit, rather than inside a transaction that
    // could be retried. Postgres ran it mid-transaction; a refund failure was
    // never fatal there either, it only shapes the response/notification.
    let refundTarget = null as { paymentId: string; amount: number } | null;
    const rows: any[] = await withTransaction(this.connection, async (session) => {
      const rows: any[] = await this.loadOrderRows(shopId, orderKey, session);
      if (!rows.length) throw new AppError('Order not found', 404);

      const currentStatus = rows[0].status;
      const allowed = TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(nextStatus)) {
        throw new AppError(
          `Cannot move an order from "${currentStatus}" to "${nextStatus}"`, 400,
        );
      }

      const saleIds = rows.map((r) => r.id);
      refundTarget = null;

      if (nextStatus === 'cancelled') {
        for (const row of rows) {
          await row.product.set({ stock_qty: row.product.stock_qty + row.quantity }).save({ session });
        }

        await this.ledger.removeByReference({
          shopId, reference: 'sale', referenceId: saleIds, session,
        });
        await this.expense.deleteMany(
          { shop_id: shopId, product_sale_id: { $in: saleIds } },
          { session },
        );

        const paidRow = rows.find((r) => r.payment_mode === 'razorpay' && r.transaction_id);
        if (paidRow) {
          const totalAmount = rows.reduce((sum, r) => sum + parseFloat(r.total_price), 0);
          refundTarget = { paymentId: paidRow.transaction_id, amount: totalAmount };
        }
      }

      for (const row of rows) {
        await row.set({ status: nextStatus }).save({ session });
      }
      return rows;
    });

    const saleIds = rows.map((r) => r.id);
    let refundInfo: any = null;
    if (refundTarget) {
      const { paymentId, amount: totalAmount } = refundTarget;
      try {
        await this.razorpay.refund(paymentId, totalAmount);
        refundInfo = { attempted: true, success: true, amount: totalAmount };
      } catch (refundErr: any) {
        refundInfo = { attempted: true, success: false, amount: totalAmount, error: refundErr.message };
      }
    }

    try {
      const buyerId = rows[0].member_id;
      if (buyerId) {
        const itemsDesc = rows.map((r) => `${r.product.name} × ${r.quantity}`).join(', ');
        let message;
        if (nextStatus === 'cancelled') {
          message = refundInfo?.success
            ? `Your order (${itemsDesc}) was cancelled and ₹${refundInfo.amount.toFixed(0)} has been refunded.`
            : refundInfo?.attempted
              ? `Your order (${itemsDesc}) was cancelled. A refund is being processed — contact the gym if it doesn't arrive shortly.`
              : `Your order (${itemsDesc}) was cancelled by the gym.`;
        } else {
          message = `Your order (${itemsDesc}) has been ${nextStatus}.`;
        }
        await this.notificationService.createNotification({
          userId: buyerId,
          shopId,
          type: `order_${nextStatus}`,
          title: `Order ${nextStatus[0].toUpperCase()}${nextStatus.slice(1)}`,
          message,
          relatedId: saleIds[0],
        });
      }
    } catch (notifyErr) {
      // eslint-disable-next-line no-console
      console.error(`Failed to send order_${nextStatus} notification:`, notifyErr);
    }

    const [group] = groupSales(rows);
    return new ApiPayload({ ...group, refund: refundInfo }, `Order marked ${nextStatus}`);
  }
}
