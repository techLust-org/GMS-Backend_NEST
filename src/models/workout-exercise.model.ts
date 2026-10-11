import { defineSchema, T } from './schema-helpers';

export const WorkoutExerciseSchema = defineSchema('workout_exercises', {
  workout_day_id: T.uuid({ required: true }),
  name: T.string({ required: true }),
  sets: T.int(),
  reps: T.int(),
  duration_secs: T.int(),
  rest_secs: T.int({ default: 60 }),
  notes: T.text(),
  order_index: T.int({ default: 0 }),
});
WorkoutExerciseSchema.index({ workout_day_id: 1 });

export const WorkoutExercise = { name: 'WorkoutExercise', schema: WorkoutExerciseSchema };
