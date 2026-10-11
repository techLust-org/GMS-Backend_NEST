import { defineSchema, T } from './schema-helpers';

export const DietPlanSchema = defineSchema('diet_plans', {
  shop_id: T.uuid({ required: true }),
  trainer_id: T.uuid({ required: true }),
  member_id: T.uuid({ required: true }),
  title: T.string({ required: true }),
  description: T.text(),
  daily_calories: T.int(),
  protein_grams: T.int(),
  carbs_grams: T.int(),
  fat_grams: T.int(),
  is_active: T.bool({ default: true }),
});
DietPlanSchema.index({ member_id: 1 });
DietPlanSchema.index({ shop_id: 1 });

export const DietPlan = { name: 'DietPlan', schema: DietPlanSchema };
