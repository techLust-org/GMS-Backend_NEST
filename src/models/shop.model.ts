import { defineSchema, T } from './schema-helpers';

export const ShopSchema = defineSchema('shops', {
  name: T.string({ required: true }),
  owner_id: T.uuid({ required: true }),
  phone: T.string(),
  email: T.string(),
  address: T.text(),
  logo_url: T.text(),
  cover_image_url: T.text(),
  theme_color: T.string(),
  is_active: T.bool({ required: true, default: false }),
  is_closed: T.bool({ required: true, default: false }),
  referral_code: T.string(),
  referred_by_shop_id: T.uuid(),
});
ShopSchema.index({ owner_id: 1 });
ShopSchema.index({ referral_code: 1 }, { unique: true, partialFilterExpression: { referral_code: { $type: 'string' } } });

export const Shop = { name: 'Shop', schema: ShopSchema };
