import { defineSchema, T } from './schema-helpers';

export const WorkoutDaySchema = defineSchema('workout_days', {
  workout_plan_id: T.uuid({ required: true }),
  day_of_week: T.enumOf(
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    { required: true },
  ),
  notes: T.text(),
});
WorkoutDaySchema.index({ workout_plan_id: 1 });

export const WorkoutDay = { name: 'WorkoutDay', schema: WorkoutDaySchema };
