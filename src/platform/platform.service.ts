import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { ShopSubscription, ShopSubscriptionPlan, Shop } from '../models';
import { RazorpayService } from '../shared/razorpay.service';
import { AppError } from '../common/app-error';
import { ApiPayload } from '../common/api-payload';

@Injectable()
export class PlatformService {
  constructor(
    @InjectModel(ShopSubscription) private readonly shopSubscription: typeof ShopSubscription,
    @InjectModel(ShopSubscriptionPlan) private readonly shopSubscriptionPlan: typeof ShopSubscriptionPlan,
    @InjectModel(Shop) private readonly shop: typeof Shop,
    private readonly razorpay: RazorpayService,
  ) {}

  async listPlans() {
    return this.shopSubscriptionPlan.findAll({
      where: { is_active: true },
      order: [['sell_price', 'ASC']],
    });
  }

  async getSubscription(shopId: number) {
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

  async createOrder(body: any) {
    const { planId } = body;
    const plan: any = await this.shopSubscriptionPlan.findOne({ where: { id: planId, is_active: true } });
    if (!plan) throw new AppError('Invalid plan', 400);

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

  async activate(shopId: number, body: any) {
    const { planId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new AppError('Payment verification details missing', 400);
    }
    const valid = this.razorpay.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!valid) throw new AppError('Payment verification failed', 400);

    const plan: any = await this.shopSubscriptionPlan.findOne({ where: { id: planId, is_active: true } });
    if (!plan) throw new AppError('Invalid plan', 400);

    const today = new Date();
    const current: any = await this.shopSubscription.findOne({
      where: { shop_id: shopId, status: 'active' },
      order: [['end_date', 'DESC']],
    });
    let startDate = today;
    if (current && new Date(current.end_date) > today) {
      startDate = new Date(current.end_date);
      await current.update({ status: 'expired' });
    }
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.duration_days);

    const sub: any = await this.shopSubscription.create({
      shop_id: shopId,
      plan_id: plan.id,
      base_price: plan.base_price,
      sell_price: plan.sell_price,
      status: 'active',
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
    } as any);

    await this.shop.update({ is_active: true }, { where: { id: shopId } });

    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return new ApiPayload(
      { ...sub.toJSON(), days_remaining: daysRemaining },
      'Platform subscription activated',
    );
  }
}
