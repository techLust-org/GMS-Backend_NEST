import { defineSchema, T } from './schema-helpers';

export const TrainerAbsenceSchema = defineSchema('trainer_absences', {
  shop_id: T.uuid({ required: true }),
  trainer_id: T.uuid({ required: true }),
  absence_date: T.dateOnly({ required: true }),
  reason: T.text(),
  notified: T.bool({ default: false }),
});
TrainerAbsenceSchema.index({ trainer_id: 1, absence_date: 1 }, { unique: true });
TrainerAbsenceSchema.index({ shop_id: 1 });

export const TrainerAbsence = { name: 'TrainerAbsence', schema: TrainerAbsenceSchema };
