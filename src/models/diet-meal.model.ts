import { defineSchema, T } from './schema-helpers';

export const DietMealSchema = defineSchema('diet_meals', {
  diet_plan_id: T.uuid({ required: true }),
  meal_name: T.string({ required: true }),
  meal_time: T.time(),
  foods: T.text({ required: true }),
  calories: T.int(),
  order_index: T.int({ default: 0 }),
});
DietMealSchema.index({ diet_plan_id: 1 });

export const DietMeal = { name: 'DietMeal', schema: DietMealSchema };
