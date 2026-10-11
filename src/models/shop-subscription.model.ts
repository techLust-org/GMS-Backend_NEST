import { defineSchema, T } from './schema-helpers';

// A shop's subscription to the platform (owner pays us).
export const ShopSubscriptionSchema = defineSchema('shop_subscriptions', {
  shop_id: T.uuid({ required: true }),
  plan_id: T.uuid({ required: true }),
  base_price: T.decimal({ required: true }),
  sell_price: T.decimal({ required: true }),
  start_date: T.dateOnly({ required: true }),
  end_date: T.dateOnly({ required: true }),
  status: T.enumOf(['active', 'expired', 'cancelled', 'pending'], { default: 'active' }),
  razorpay_order_id: T.string(),
  razorpay_payment_id: T.string(),
});
ShopSubscriptionSchema.index({ shop_id: 1, status: 1 });
ShopSubscriptionSchema.index({ plan_id: 1 });
// Idempotency guardrail: one Razorpay payment can back at most one
// subscription, even under concurrent duplicate submissions.
ShopSubscriptionSchema.index(
  { razorpay_payment_id: 1 },
  { unique: true, partialFilterExpression: { razorpay_payment_id: { $type: 'string' } } },
);

export const ShopSubscription = { name: 'ShopSubscription', schema: ShopSubscriptionSchema };
