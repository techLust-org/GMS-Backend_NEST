import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { ShopSubscription, ShopSubscriptionPlan, Shop, PendingPayment, Referral } from '../models';
import { RazorpayService } from '../shared/razorpay.service';
import { AppError } from '../common/app-error';
import { ApiPayload } from '../common/api-payload';
import { generateUniqueReferralCode } from '../common/referral-code';
import { withTransaction, isUniqueViolation } from '../database/db-utils';

// How many successful referrals earn a free platform-subscription cycle.
// See "Refer a Gym" feature — a shop's next renewal is free once this many
// of its referred shops have themselves paid for a first subscription.
const REFERRAL_REQUIRED_COUNT = parseInt(process.env.REFERRAL_REQUIRED_COUNT, 10) || 3;

@Injectable()
export class PlatformService {
  constructor(
    @InjectModel(ShopSubscription.name) private readonly shopSubscription: Model<any>,
    @InjectModel(ShopSubscriptionPlan.name) private readonly shopSubscriptionPlan: Model<any>,
    @InjectModel(Shop.name) private readonly shop: Model<any>,
    @InjectModel(PendingPayment.name) private readonly pendingPayment: Model<any>,
    @InjectModel(Referral.name) private readonly referral: Model<any>,
    @InjectConnection() private readonly connection: Connection,
    private readonly razorpay: RazorpayService,
  ) {}

  private serializeSubscription(sub: any) {
    const daysRemaining = Math.ceil(
      (new Date(sub.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    return { ...sub.toJSON(), days_remaining: daysRemaining };
  }

  async listPlans() {
    return this.shopSubscriptionPlan.find({ is_active: true }).sort({ sell_price: 1 });
  }

  async getSubscription(shopId: string) {
    const today = new Date().toISOString().split('T')[0];
    const sub: any = await this.shopSubscription
      .findOne({ shop_id: shopId, status: 'active', end_date: { $gte: today } })
      .populate('plan')
      .sort({ end_date: -1 });
    if (!sub) return new ApiPayload(null, 'No active platform subscription');

    const endDate = new Date(sub.end_date);
    const daysRemaining = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return { ...sub.toJSON(), days_remaining: daysRemaining };
  }

  async createOrder(shopId: string, body: any) {
    const { planId } = body;
    const plan: any = await this.shopSubscriptionPlan.findOne({ _id: planId, is_active: true });
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
    const already: any = await this.shopSubscription.findOne({ razorpay_payment_id: razorpayPaymentId });
    if (already) {
      return new ApiPayload(this.serializeSubscription(already), 'Platform subscription activated');
    }

    // The plan/amount to grant comes from what createOrder() resolved and
    // stored server-side for this exact order — not from the client body.
    const pending: any = await this.pendingPayment.findOne({
      razorpay_order_id: razorpayOrderId, shop_id: shopId, kind: 'platform_subscription',
    });
    if (!pending) throw new AppError('No matching order found for this payment', 400);
    if (pending.consumed_at) throw new AppError('This payment has already been processed', 409);

    const plan: any = await this.shopSubscriptionPlan.findOne({ _id: pending.payload.planId, is_active: true });
    if (!plan) throw new AppError('Invalid plan', 400);

    try {
      // Concurrent activations for the same shop both write the current
      // subscription document, so MongoDB serializes them (the loser's
      // transaction retries) — what SELECT ... FOR UPDATE did in Postgres.
      const sub: any = await withTransaction(this.connection, async (session) => {
        const today = new Date();

        // Must be read before this payment's row is created below — it's
        // what tells us whether this is the shop's first-ever paid cycle,
        // which is the referral-conversion trigger.
        const isFirstSubscription =
          (await this.shopSubscription.countDocuments({ shop_id: shopId }).session(session)) === 0;

        const current: any = await this.shopSubscription
          .findOne({ shop_id: shopId, status: 'active' })
          .sort({ end_date: -1 })
          .session(session);
        let startDate = today;
        if (current && new Date(current.end_date) > today) {
          startDate = new Date(current.end_date);
          await current.set({ status: 'expired' }).save({ session });
        }
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + plan.duration_days);

        const created: any = await new this.shopSubscription({
          shop_id: shopId,
          plan_id: plan.id,
          base_price: plan.base_price,
          sell_price: plan.sell_price,
          status: 'active',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
        }).save({ session });

        await this.shop.updateOne({ _id: shopId }, { $set: { is_active: true } }, { session });
        await pending.set({ consumed_at: new Date() }).save({ session });

        // Referral becomes successful the moment the referred shop pays for
        // its first-ever cycle — renewals after that don't re-trigger it.
        if (isFirstSubscription) {
          const referredShop: any = await this.shop.findById(shopId).session(session);
          if (referredShop?.referred_by_shop_id) {
            await this.referral.updateMany(
              { referred_shop_id: shopId, status: 'pending' },
              { $set: { status: 'successful', converted_at: new Date() } },
              { session },
            );
          }
        }
        return created;
      });
      return new ApiPayload(this.serializeSubscription(sub), 'Platform subscription activated');
    } catch (err: any) {
      // Lost a race to a concurrent request processing the same payment —
      // the unique index on razorpay_payment_id caught it. Return the
      // winner's result instead of surfacing a 500.
      if (isUniqueViolation(err)) {
        const existing: any = await this.shopSubscription.findOne({ razorpay_payment_id: razorpayPaymentId });
        if (existing) {
          return new ApiPayload(this.serializeSubscription(existing), 'Platform subscription activated');
        }
      }
      throw err;
    }
  }

  async getReferralInfo(shopId: string) {
    const shop: any = await this.shop.findById(shopId);
    if (!shop) throw new AppError('Shop not found', 404);

    let referralCode = shop.referral_code;
    if (!referralCode) {
      // Backfill for shops created before the referral feature shipped.
      referralCode = await generateUniqueReferralCode(this.shop);
      await shop.set({ referral_code: referralCode }).save();
    }

    const successfulCount = await this.referral.countDocuments({
      referrer_shop_id: shopId, status: 'successful',
    });
    const unredeemedCount = await this.referral.countDocuments({
      referrer_shop_id: shopId, status: 'successful', redeemed_at: null,
    });

    return new ApiPayload({
      referralCode,
      requiredCount: REFERRAL_REQUIRED_COUNT,
      successfulCount,
      unredeemedCount,
      redeemedCount: successfulCount - unredeemedCount,
      freeCyclesAvailable: Math.floor(unredeemedCount / REFERRAL_REQUIRED_COUNT),
    });
  }

  // Consumes REFERRAL_REQUIRED_COUNT unredeemed successful referrals (oldest
  // first) and grants one free cycle of whatever plan this shop most
  // recently subscribed to — same zero-price-subscription mechanism the
  // superadmin's manual grant() uses, just owner-triggered.
  // Concurrent redemptions both write the same referral documents, so
  // MongoDB serializes them (the loser retries and sees them redeemed) —
  // what SELECT ... FOR UPDATE did in Postgres.
  async redeemReferralReward(shopId: string) {
    return withTransaction(this.connection, async (session) => {
      const shop: any = await this.shop.findById(shopId).session(session);
      if (!shop) throw new AppError('Shop not found', 404);

      const eligible: any[] = await this.referral
        .find({ referrer_shop_id: shopId, status: 'successful', redeemed_at: null })
        .sort({ converted_at: 1 })
        .limit(REFERRAL_REQUIRED_COUNT)
        .session(session);
      if (eligible.length < REFERRAL_REQUIRED_COUNT) {
        throw new AppError(
          `You need ${REFERRAL_REQUIRED_COUNT} successful referrals to redeem a free cycle ` +
            `(you have ${eligible.length}).`,
          400,
        );
      }

      const lastSub: any = await this.shopSubscription
        .findOne({ shop_id: shopId })
        .sort({ end_date: -1 })
        .session(session);
      if (!lastSub) {
        throw new AppError('No subscription plan on file to renew for free — subscribe once first.', 400);
      }
      const plan: any = await this.shopSubscriptionPlan.findById(lastSub.plan_id).session(session);
      if (!plan) throw new AppError('Your previous plan is no longer available', 400);

      const today = new Date();
      const current: any = await this.shopSubscription
        .findOne({ shop_id: shopId, status: 'active', end_date: { $gte: today.toISOString().split('T')[0] } })
        .sort({ end_date: -1 })
        .session(session);
      let startDate = today;
      if (current) {
        startDate = new Date(current.end_date);
        await current.set({ status: 'expired' }).save({ session });
      }
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + plan.duration_days);

      const sub = await new this.shopSubscription({
        shop_id: shopId,
        plan_id: plan.id,
        base_price: plan.base_price,
        sell_price: 0,
        status: 'active',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        razorpay_payment_id: `REFERRAL_REWARD_${randomUUID()}`,
      }).save({ session });

      await shop.set({ is_active: true }).save({ session });
      await this.referral.updateMany(
        { _id: { $in: eligible.map((r) => r.id) } },
        { $set: { redeemed_at: new Date() } },
        { session },
      );

      return new ApiPayload(
        this.serializeSubscription(sub),
        `Redeemed ${REFERRAL_REQUIRED_COUNT} referrals for a free ${plan.name} cycle`,
      );
    });
  }
}
