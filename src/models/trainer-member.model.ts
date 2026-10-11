import { defineSchema, T } from './schema-helpers';

export const TrainerMemberSchema = defineSchema('trainer_members', {
  shop_id: T.uuid({ required: true }),
  trainer_id: T.uuid({ required: true }),
  member_id: T.uuid({ required: true }),
  is_active: T.bool({ default: true }),
  assigned_at: T.date({ default: () => new Date() }),
});
TrainerMemberSchema.index({ trainer_id: 1, is_active: 1 });
TrainerMemberSchema.index({ member_id: 1, is_active: 1 });
TrainerMemberSchema.index({ shop_id: 1 });

export const TrainerMember = { name: 'TrainerMember', schema: TrainerMemberSchema };
