import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Subscription, SubscriptionPlan, Payment, ExpenseCategory, Expense, User } from '../../models';
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
    private readonly razorpay: RazorpayService,
    private readonly ledger: LedgerService,
    private readonly notificationService: NotificationService,
  ) {}

  async getPlans(shopId: number) {
    return this.subscriptionPlan.findAll({
      where: { shop_id: shopId, is_active: true },
      order: [['sell_price', 'ASC']],
    });
  }

  async mySubscriptions(shopId: number, userId: number) {
    return this.subscription.findAll({
      where: { shop_id: shopId, member_id: userId },
      include: [{ model: SubscriptionPlan, as: 'plan' }],
      order: [['created_at', 'DESC']],
    });
  }

  async activeSubscription(shopId: number, userId: number) {
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

  async createOrder(shopId: number, userId: number, body: any) {
    const { planId } = body;
    const plan: any = await this.subscriptionPlan.findOne({ where: { id: planId, shop_id: shopId } });
    if (!plan || !plan.is_active) throw new AppError('Plan not found or inactive', 404);

    const existing = await this.subscription.findOne({
      where: { shop_id: shopId, member_id: userId, status: 'active' },
    });
    if (existing) throw new AppError('You already have an active subscription', 409);

    const order = await this.razorpay.createOrder(plan.sell_price, 'INR');

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planId: plan.id,
      planName: plan.name,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  async purchase(shopId: number, userId: number, body: any) {
    const { planId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new AppError('Payment verification details missing', 400);
    }
    const valid = this.razorpay.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!valid) throw new AppError('Payment verification failed', 400);

    const plan: any = await this.subscriptionPlan.findOne({ where: { id: planId, shop_id: shopId } });
    if (!plan || !plan.is_active) throw new AppError('Plan not found or inactive', 404);

    const existing = await this.subscription.findOne({
      where: { shop_id: shopId, member_id: userId, status: 'active' },
    });
    if (existing) throw new AppError('You already have an active subscription', 409);

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.duration_days);

    const sub: any = await this.subscription.create({
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
    } as any);

    await this.payment.create({
      shop_id: shopId,
      member_id: userId,
      subscription_id: sub.id,
      amount: plan.sell_price,
      payment_date: startDate.toISOString().split('T')[0],
      payment_method: 'razorpay',
    } as any);

    await this.ledger.record({
      shopId,
      type: 'credit',
      amount: plan.sell_price,
      reference: 'subscription',
      referenceId: sub.id,
    });

    const [subscriptionCategory]: any = await this.expenseCategory.findOrCreate({
      where: { shop_id: shopId, name: 'Subscription', type: 'credit' },
      defaults: { shop_id: shopId, name: 'Subscription', type: 'credit' } as any,
    });
    const buyer: any = await this.user.findByPk(userId, {
      attributes: ['first_name', 'last_name', 'email', 'phone'],
    });
    const buyerName = buyer ? `${buyer.first_name} ${buyer.last_name}`.trim() : null;
    const buyerContact = buyer
      ? [buyer.email, buyer.phone].filter(Boolean).join(', ')
      : null;
    await this.expense.create({
      shop_id: shopId,
      category_id: subscriptionCategory.id,
      description: buyerContact
        ? `${plan.name} plan — ${buyerName} (${buyerContact})`
        : `${plan.name} plan${buyerName ? ` — ${buyerName}` : ''}`,
      amount: plan.sell_price,
      expense_date: startDate.toISOString().split('T')[0],
      paid_to: buyerName,
    } as any);

    await this.notificationService.createNotification({
      userId,
      shopId,
      type: 'subscription_purchased',
      title: 'Subscription Activated',
      message: `Your ${plan.name} has been activated. Valid until ${endDate.toDateString()}.`,
      relatedId: sub.id,
    });

    return new ApiPayload({ ...sub.toJSON(), plan }, 'Subscription activated');
  }
}
