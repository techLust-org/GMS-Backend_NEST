import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Subscription, SubscriptionPlan, Payment, ExpenseCategory, Expense, User, PendingPayment } from '../../models';
import { RazorpayService } from '../../shared/razorpay.service';
import { LedgerService } from '../../shared/ledger.service';
import { NotificationService } from '../../shared/notification.service';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';
import { withTransaction, isUniqueViolation } from '../../database/db-utils';

@Injectable()
export class MemberSubscriptionService {
  constructor(
    @InjectModel(Subscription.name) private readonly subscription: Model<any>,
    @InjectModel(SubscriptionPlan.name) private readonly subscriptionPlan: Model<any>,
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

  async getPlans(shopId: string) {
    return this.subscriptionPlan.find({ shop_id: shopId, is_active: true }).sort({ sell_price: 1 });
  }

  async mySubscriptions(shopId: string, userId: string) {
    return this.subscription
      .find({ shop_id: shopId, member_id: userId })
      .populate('plan')
      .sort({ createdAt: -1 });
  }

  async activeSubscription(shopId: string, userId: string) {
    const sub: any = await this.subscription
      .findOne({ shop_id: shopId, member_id: userId, status: 'active' })
      .populate('plan')
      .sort({ end_date: -1 });
    if (!sub) return new ApiPayload(null, 'No active subscription');

    const today = new Date();
    const endDate = new Date(sub.end_date);
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return { ...sub.toJSON(), days_remaining: daysRemaining };
  }

  async createOrder(shopId: string, userId: string, body: any) {
    const { planId } = body;
    const plan: any = await this.subscriptionPlan.findOne({ _id: planId, shop_id: shopId });
    if (!plan || !plan.is_active) throw new AppError('Plan not found or inactive', 404);

    const existing = await this.subscription.findOne({ shop_id: shopId, member_id: userId, status: 'active' });
    if (existing) throw new AppError('You already have an active subscription', 409);

    const order = await this.razorpay.createOrder(plan.sell_price, 'INR');

    // Remembers what this order was actually created for — purchase() must
    // read the grant back from here, never trust a client-resubmitted
    // planId at confirm time (a signature only proves *a* payment is
    // genuine, not that it matches what's being confirmed).
    await this.pendingPayment.create({
      shop_id: shopId,
      user_id: userId,
      kind: 'member_subscription',
      razorpay_order_id: order.id,
      amount: plan.sell_price,
      payload: { planId: plan.id },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planId: plan.id,
      planName: plan.name,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  async purchase(shopId: string, userId: string, body: any) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new AppError('Payment verification details missing', 400);
    }
    const valid = this.razorpay.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!valid) throw new AppError('Payment verification failed', 400);

    // Idempotency: a retried request for a payment we've already processed
    // (dropped response, double-tap, etc.) must return the same result —
    // checked before the "already have an active subscription" guard below,
    // so a legitimate retry gets its subscription back, not a 409.
    const already: any = await this.subscription
      .findOne({ razorpay_payment_id: razorpayPaymentId })
      .populate('plan');
    if (already) {
      return new ApiPayload(already.toJSON(), 'Subscription activated');
    }

    // The plan/amount to grant comes from what createOrder() resolved and
    // stored server-side for this exact order — not from the client body.
    const pending: any = await this.pendingPayment.findOne({
      razorpay_order_id: razorpayOrderId,
      shop_id: shopId,
      user_id: userId,
      kind: 'member_subscription',
    });
    if (!pending) throw new AppError('No matching order found for this payment', 400);
    if (pending.consumed_at) throw new AppError('This payment has already been processed', 409);

    const planId = pending.payload.planId;
    const plan: any = await this.subscriptionPlan.findOne({ _id: planId, shop_id: shopId });
    if (!plan || !plan.is_active) throw new AppError('Plan not found or inactive', 404);

    const existing = await this.subscription.findOne({ shop_id: shopId, member_id: userId, status: 'active' });
    if (existing) throw new AppError('You already have an active subscription', 409);

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.duration_days);

    let sub: any;
    try {
      sub = await withTransaction(this.connection, async (session) => {
        const created: any = await new this.subscription({
          shop_id: shopId,
          member_id: userId,
          plan_id: planId,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          status: 'active',
          base_price: plan.base_price,
          sell_price: plan.sell_price,
          amount_paid: plan.sell_price,
          payment_method: 'razorpay',
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
        }).save({ session });

        await new this.payment({
          shop_id: shopId,
          member_id: userId,
          subscription_id: created.id,
          amount: plan.sell_price,
          payment_date: startDate.toISOString().split('T')[0],
          payment_method: 'razorpay',
        }).save({ session });

        await this.ledger.record({
          shopId,
          type: 'credit',
          amount: plan.sell_price,
          reference: 'subscription',
          referenceId: created.id,
          session,
        });

        const subscriptionCategory: any = await this.expenseCategory.findOneAndUpdate(
          { shop_id: shopId, name: 'Subscription', type: 'credit' },
          { $setOnInsert: { shop_id: shopId, name: 'Subscription', type: 'credit' } },
          { upsert: true, new: true, session },
        );
        const buyer: any = await this.user
          .findById(userId)
          .select('first_name last_name email phone')
          .session(session);
        const buyerName = buyer ? `${buyer.first_name} ${buyer.last_name}`.trim() : null;
        const buyerContact = buyer
          ? [buyer.email, buyer.phone].filter(Boolean).join(', ')
          : null;
        await new this.expense({
          shop_id: shopId,
          category_id: subscriptionCategory.id,
          description: buyerContact
            ? `${plan.name} plan — ${buyerName} (${buyerContact})`
            : `${plan.name} plan${buyerName ? ` — ${buyerName}` : ''}`,
          amount: plan.sell_price,
          expense_date: startDate.toISOString().split('T')[0],
          paid_to: buyerName,
        }).save({ session });

        await pending.set({ consumed_at: new Date() }).save({ session });
        return created;
      });
    } catch (err: any) {
      // Lost a race to a concurrent request processing the same payment —
      // the unique index on razorpay_payment_id caught it.
      if (isUniqueViolation(err)) {
        const existingSub: any = await this.subscription
          .findOne({ razorpay_payment_id: razorpayPaymentId })
          .populate('plan');
        if (existingSub) {
          return new ApiPayload(existingSub.toJSON(), 'Subscription activated');
        }
      }
      throw err;
    }

    // Fired after commit — a notification failure shouldn't roll back a
    // payment that already succeeded.
    try {
      await this.notificationService.createNotification({
        userId,
        shopId,
        type: 'subscription_purchased',
        title: 'Subscription Activated',
        message: `Your ${plan.name} has been activated. Valid until ${endDate.toDateString()}.`,
        relatedId: sub.id,
      });
    } catch (notifyErr) {
      // eslint-disable-next-line no-console
      console.error('Failed to send subscription_purchased notification:', notifyErr);
    }

    return new ApiPayload({ ...sub.toJSON(), plan }, 'Subscription activated');
  }
}
