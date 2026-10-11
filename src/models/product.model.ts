import { defineSchema, T } from './schema-helpers';

export const ProductSchema = defineSchema('products', {
  shop_id: T.uuid({ required: true }),
  name: T.string({ required: true }),
  description: T.text(),
  cost_price: T.decimal({ required: true, default: 0 }),
  discount: T.decimal({ required: true, default: 0 }),
  sell_price: T.decimal({ required: true, default: 0 }),
  stock_qty: T.int({ default: 0 }),
  category: T.string(),
  sku: T.string(),
  photo_url: T.text(),
  is_active: T.bool({ default: true }),
  low_stock_threshold: T.int({ default: 5 }),
});
ProductSchema.index({ shop_id: 1 });
// Unique like the SQL column — which allowed any number of NULL skus.
ProductSchema.index({ sku: 1 }, { unique: true, partialFilterExpression: { sku: { $type: 'string' } } });

export const Product = { name: 'Product', schema: ProductSchema };
