import { defineSchema, T } from './schema-helpers';

export const SubscriptionSchema = defineSchema('subscriptions', {
  shop_id: T.uuid({ required: true }),
  member_id: T.uuid({ required: true }),
  plan_id: T.uuid({ required: true }),
  start_date: T.dateOnly({ required: true }),
  end_date: T.dateOnly({ required: true }),
  status: T.enumOf(['active', 'expired', 'cancelled', 'pending'], { default: 'active' }),
  base_price: T.decimal(),
  sell_price: T.decimal(),
  amount_paid: T.decimal({ required: true }),
  payment_method: T.string({ default: 'cash' }),
  payment_ref: T.string(),
  razorpay_order_id: T.string(),
  razorpay_payment_id: T.string(),
});
SubscriptionSchema.index({ shop_id: 1 });
SubscriptionSchema.index({ member_id: 1 });
SubscriptionSchema.index({ end_date: 1 });
SubscriptionSchema.index({ status: 1 });
// Idempotency guardrail: one Razorpay payment can back at most one
// subscription, even under concurrent duplicate submissions.
SubscriptionSchema.index(
  { razorpay_payment_id: 1 },
  { unique: true, partialFilterExpression: { razorpay_payment_id: { $type: 'string' } } },
);

export const Subscription = { name: 'Subscription', schema: SubscriptionSchema };
