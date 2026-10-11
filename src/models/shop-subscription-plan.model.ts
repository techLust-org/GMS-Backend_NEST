import { defineSchema, T } from './schema-helpers';

// Platform plans that WE sell to gym owners (shops).
export const ShopSubscriptionPlanSchema = defineSchema('shop_subscription_plans', {
  name: T.string({ required: true }),
  plan_type: T.enumOf(['monthly', 'quarterly', 'yearly'], { required: true }),
  duration_days: T.int({ required: true }),
  base_price: T.decimal({ required: true }),
  discount: T.decimal({ required: true, default: 0 }),
  sell_price: T.decimal({ required: true }),
  description: T.text(),
  is_active: T.bool({ required: true, default: true }),
});

export const ShopSubscriptionPlan = { name: 'ShopSubscriptionPlan', schema: ShopSubscriptionPlanSchema };
