import { defineSchema, T } from './schema-helpers';

// password_hash is excluded from every query by default (the old
// Sequelize defaultScope); select('+password_hash') is the old
// `withPassword` scope.
export const UserSchema = defineSchema('users', {
  role_id: T.uuid({ required: true }),
  shop_id: T.uuid(),
  first_name: T.string({ required: true }),
  last_name: T.string({ required: true }),
  email: T.string({ required: true }),
  password_hash: T.string({ required: true, select: false }),
  phone: T.string(),
  date_of_birth: T.dateOnly(),
  gender: T.enumOf(['male', 'female', 'other']),
  profile_pic: T.text(),
  status: T.enumOf(['active', 'inactive', 'suspended'], { default: 'active' }),
  hire_date: T.dateOnly(),
  salary: T.decimal(),
  emergency_contact: T.string(),
  specialization: T.string(),
  bio: T.text(),
  govt_id_url: T.text(),
  fcm_token: T.text(),
  google_id: T.string(),
  // Set when the account owner self-deletes via /auth/delete-account.
  // Personal fields get anonymized at the same time — this timestamp is
  // just the audit marker of when that happened.
  deleted_at: T.date(),
});
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ google_id: 1 }, { unique: true, partialFilterExpression: { google_id: { $type: 'string' } } });
UserSchema.index({ role_id: 1, status: 1 });
UserSchema.index({ shop_id: 1 });
UserSchema.index({ phone: 1 });

export const User = { name: 'User', schema: UserSchema };
