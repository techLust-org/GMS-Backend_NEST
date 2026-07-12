import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Subscription, SubscriptionPlan, Payment, ExpenseCategory, Expense, User, PendingPayment } from '../../models';
import { RazorpayService } from '../../shared/razorpay.service';
import { LedgerService } from '../../shared/ledger.service';
import { NotificationService } from '../../shared/notification.service';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';

@Injectable()
export class MemberSubscriptionService {
  constructor(
    @InjectModel(Subscription) private readonly subscription: typeof Subscription,
    @InjectModel(SubscriptionPlan) private readonly subscriptionPlan: typeof SubscriptionPlan,
    @InjectModel(Payment) private readonly payment: typeof Payment,
    @InjectModel(ExpenseCategory) private readonly expenseCategory: typeof ExpenseCategory,
    @InjectModel(Expense) private readonly expense: typeof Expense,
    @InjectModel(User) private readonly user: typeof User,
    @InjectModel(PendingPayment) private readonly pendingPayment: typeof PendingPayment,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly razorpay: RazorpayService,
    private readonly ledger: LedgerService,
    private readonly notificationService: NotificationService,
  ) {}

  async getPlans(shopId: string) {
    return this.subscriptionPlan.findAll({
      where: { shop_id: shopId, is_active: true },
      order: [['sell_price', 'ASC']],
    });
  }

  async mySubscriptions(shopId: string, userId: string) {
    return this.subscription.findAll({
      where: { shop_id: shopId, member_id: userId },
      include: [{ model: SubscriptionPlan, as: 'plan' }],
      order: [['created_at', 'DESC']],
    });
  }

  async activeSubscription(shopId: string, userId: string) {
    const sub: any = await this.subscription.findOne({
      where: { shop_id: shopId, member_id: userId, status: 'active' },
      include: [{ model: SubscriptionPlan, as: 'plan' }],
      order: [['end_date', 'DESC']],
    });
    if (!sub) return new ApiPayload(null, 'No active subscription');

    const today = new Date();
    const endDate = new Date(sub.end_date);
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return { ...sub.toJSON(), days_remaining: daysRemaining };
  }

  async createOrder(shopId: string, userId: string, body: any) {
    const { planId } = body;
    const plan: any = await this.subscriptionPlan.findOne({ where: { id: planId, shop_id: shopId } });
    if (!plan || !plan.is_active) throw new AppError('Plan not found or inactive', 404);

    const existing = await this.subscription.findOne({
      where: { shop_id: shopId, member_id: userId, status: 'active' },
    });
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
    const already: any = await this.subscription.findOne({
      where: { razorpay_payment_id: razorpayPaymentId },
      include: [{ model: SubscriptionPlan, as: 'plan' }],
    });
    if (already) {
      return new ApiPayload(already.toJSON(), 'Subscription activated');
    }

    // The plan/amount to grant comes from what createOrder() resolved and
    // stored server-side for this exact order — not from the client body.
    const pending: any = await this.pendingPayment.findOne({
      where: {
        razorpay_order_id: razorpayOrderId,
        shop_id: shopId,
        user_id: userId,
        kind: 'member_subscription',
      },
    });
    if (!pending) throw new AppError('No matching order found for this payment', 400);
    if (pending.consumed_at) throw new AppError('This payment has already been processed', 409);

    const planId = pending.payload.planId;
    const plan: any = await this.subscriptionPlan.findOne({ where: { id: planId, shop_id: shopId } });
    if (!plan || !plan.is_active) throw new AppError('Plan not found or inactive', 404);

    const existing = await this.subscription.findOne({
      where: { shop_id: shopId, member_id: userId, status: 'active' },
    });
    if (existing) throw new AppError('You already have an active subscription', 409);

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.duration_days);

    const t: any = await this.sequelize.transaction();
    let sub: any;
    try {
      sub = await this.subscription.create(
        {
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
        } as any,
        { transaction: t },
      );

      await this.payment.create(
        {
          shop_id: shopId,
          member_id: userId,
          subscription_id: sub.id,
          amount: plan.sell_price,
          payment_date: startDate.toISOString().split('T')[0],
          payment_method: 'razorpay',
        } as any,
        { transaction: t },
      );

      await this.ledger.record({
        shopId,
        type: 'credit',
        amount: plan.sell_price,
        reference: 'subscription',
        referenceId: sub.id,
        transaction: t,
      });

      const [subscriptionCategory]: any = await this.expenseCategory.findOrCreate({
        where: { shop_id: shopId, name: 'Subscription', type: 'credit' },
        defaults: { shop_id: shopId, name: 'Subscription', type: 'credit' } as any,
        transaction: t,
      });
      const buyer: any = await this.user.findByPk(userId, {
        attributes: ['first_name', 'last_name', 'email', 'phone'],
        transaction: t,
      });
      const buyerName = buyer ? `${buyer.first_name} ${buyer.last_name}`.trim() : null;
      const buyerContact = buyer
        ? [buyer.email, buyer.phone].filter(Boolean).join(', ')
        : null;
      await this.expense.create(
        {
          shop_id: shopId,
          category_id: subscriptionCategory.id,
          description: buyerContact
            ? `${plan.name} plan — ${buyerName} (${buyerContact})`
            : `${plan.name} plan${buyerName ? ` — ${buyerName}` : ''}`,
          amount: plan.sell_price,
          expense_date: startDate.toISOString().split('T')[0],
          paid_to: buyerName,
        } as any,
        { transaction: t },
      );

      await pending.update({ consumed_at: new Date() }, { transaction: t });

      await t.commit();
    } catch (err: any) {
      if (!t.finished) await t.rollback();
      // Lost a race to a concurrent request processing the same payment —
      // the unique constraint on razorpay_payment_id caught it.
      if (err.name === 'SequelizeUniqueConstraintError') {
        const existingSub: any = await this.subscription.findOne({
          where: { razorpay_payment_id: razorpayPaymentId },
          include: [{ model: SubscriptionPlan, as: 'plan' }],
        });
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
