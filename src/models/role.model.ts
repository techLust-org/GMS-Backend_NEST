import { defineSchema, T } from './schema-helpers';

export const RoleSchema = defineSchema('roles', {
  name: T.string({ required: true }),
});
RoleSchema.index({ name: 1 }, { unique: true });

export const Role = { name: 'Role', schema: RoleSchema };
