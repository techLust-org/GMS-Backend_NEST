import { defineSchema, T } from './schema-helpers';

export const WorkoutPlanSchema = defineSchema('workout_plans', {
  shop_id: T.uuid({ required: true }),
  trainer_id: T.uuid({ required: true }),
  member_id: T.uuid({ required: true }),
  title: T.string({ required: true }),
  description: T.text(),
  goal: T.string(),
  is_active: T.bool({ default: true }),
  start_date: T.dateOnly(),
  end_date: T.dateOnly(),
});
WorkoutPlanSchema.index({ member_id: 1 });
WorkoutPlanSchema.index({ shop_id: 1 });

export const WorkoutPlan = { name: 'WorkoutPlan', schema: WorkoutPlanSchema };
