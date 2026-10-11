import { defineSchema, T } from './schema-helpers';

// Member-facing plans, defined per shop by the owner.
export const SubscriptionPlanSchema = defineSchema('subscription_plans', {
  shop_id: T.uuid({ required: true }),
  name: T.string({ required: true }),
  duration: T.enumOf(['monthly', 'quarterly', 'yearly'], { required: true }),
  duration_days: T.int({ required: true }),
  base_price: T.decimal({ required: true }),
  discount: T.decimal({ required: true, default: 0 }),
  sell_price: T.decimal({ required: true }),
  description: T.text(),
  is_active: T.bool({ default: true }),
});
SubscriptionPlanSchema.index({ shop_id: 1 });

export const SubscriptionPlan = { name: 'SubscriptionPlan', schema: SubscriptionPlanSchema };
