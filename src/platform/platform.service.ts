import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ShopSubscription, ShopSubscriptionPlan, Shop, PendingPayment } from '../models';
import { RazorpayService } from '../shared/razorpay.service';
import { AppError } from '../common/app-error';
import { ApiPayload } from '../common/api-payload';

@Injectable()
export class PlatformService {
  constructor(
    @InjectModel(ShopSubscription) private readonly shopSubscription: typeof ShopSubscription,
    @InjectModel(ShopSubscriptionPlan) private readonly shopSubscriptionPlan: typeof ShopSubscriptionPlan,
    @InjectModel(Shop) private readonly shop: typeof Shop,
    @InjectModel(PendingPayment) private readonly pendingPayment: typeof PendingPayment,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly razorpay: RazorpayService,
  ) {}

  private serializeSubscription(sub: any) {
    const daysRemaining = Math.ceil(
      (new Date(sub.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    return { ...sub.toJSON(), days_remaining: daysRemaining };
  }

  async listPlans() {
    return this.shopSubscriptionPlan.findAll({
      where: { is_active: true },
      order: [['sell_price', 'ASC']],
    });
  }

  async getSubscription(shopId: string) {
    const today = new Date().toISOString().split('T')[0];
    const sub: any = await this.shopSubscription.findOne({
      where: { shop_id: shopId, status: 'active', end_date: { [Op.gte]: today } },
      include: [{ model: ShopSubscriptionPlan, as: 'plan' }],
      order: [['end_date', 'DESC']],
    });
    if (!sub) return new ApiPayload(null, 'No active platform subscription');

    const endDate = new Date(sub.end_date);
    const daysRemaining = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return { ...sub.toJSON(), days_remaining: daysRemaining };
  }

  async createOrder(shopId: string, body: any) {
    const { planId } = body;
    const plan: any = await this.shopSubscriptionPlan.findOne({ where: { id: planId, is_active: true } });
    if (!plan) throw new AppError('Invalid plan', 400);

    const order = await this.razorpay.createOrder(plan.sell_price, 'INR');

    // Remembers what this order was actually created for — activate() must
    // read the grant back from here, never trust a client-resubmitted
    // planId at confirm time (a signature only proves *a* payment is
    // genuine, not that it matches what's being confirmed).
    await this.pendingPayment.create({
      shop_id: shopId,
      kind: 'platform_subscription',
      razorpay_order_id: order.id,
      amount: plan.sell_price,
      payload: { planId: plan.id },
    } as any);

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planId: plan.id,
      planName: plan.name,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  async activate(shopId: string, body: any) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new AppError('Payment verification details missing', 400);
    }
    const valid = this.razorpay.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!valid) throw new AppError('Payment verification failed', 400);

    // Idempotency: a retried request for a payment we've already processed
    // (dropped response, double-tap, etc.) must return the same result,
    // not grant a second subscription period for one payment.
    const already: any = await this.shopSubscription.findOne({
      where: { razorpay_payment_id: razorpayPaymentId },
    });
    if (already) {
      return new ApiPayload(this.serializeSubscription(already), 'Platform subscription activated');
    }

    // The plan/amount to grant comes from what createOrder() resolved and
    // stored server-side for this exact order — not from the client body.
    const pending: any = await this.pendingPayment.findOne({
      where: { razorpay_order_id: razorpayOrderId, shop_id: shopId, kind: 'platform_subscription' },
    });
    if (!pending) throw new AppError('No matching order found for this payment', 400);
    if (pending.consumed_at) throw new AppError('This payment has already been processed', 409);

    const plan: any = await this.shopSubscriptionPlan.findOne({
      where: { id: pending.payload.planId, is_active: true },
    });
    if (!plan) throw new AppError('Invalid plan', 400);

    const t: any = await this.sequelize.transaction();
    try {
      const today = new Date();
      const current: any = await this.shopSubscription.findOne({
        where: { shop_id: shopId, status: 'active' },
        order: [['end_date', 'DESC']],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      let startDate = today;
      if (current && new Date(current.end_date) > today) {
        startDate = new Date(current.end_date);
        await current.update({ status: 'expired' }, { transaction: t });
      }
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + plan.duration_days);

      const sub: any = await this.shopSubscription.create(
        {
          shop_id: shopId,
          plan_id: plan.id,
          base_price: plan.base_price,
          sell_price: plan.sell_price,
          status: 'active',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
        } as any,
        { transaction: t },
      );

      await this.shop.update({ is_active: true }, { where: { id: shopId }, transaction: t });
      await pending.update({ consumed_at: new Date() }, { transaction: t });

      await t.commit();
      return new ApiPayload(this.serializeSubscription(sub), 'Platform subscription activated');
    } catch (err: any) {
      if (!t.finished) await t.rollback();
      // Lost a race to a concurrent request processing the same payment —
      // the unique constraint on razorpay_payment_id caught it. Return the
      // winner's result instead of surfacing a 500.
      if (err.name === 'SequelizeUniqueConstraintError') {
        const existing: any = await this.shopSubscription.findOne({
          where: { razorpay_payment_id: razorpayPaymentId },
        });
        if (existing) {
          return new ApiPayload(this.serializeSubscription(existing), 'Platform subscription activated');
        }
      }
      throw err;
    }
  }
}
