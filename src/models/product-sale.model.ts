import { defineSchema, T } from './schema-helpers';

export const ProductSaleSchema = defineSchema('product_sales', {
  shop_id: T.uuid({ required: true }),
  product_id: T.uuid({ required: true }),
  member_id: T.uuid(),
  quantity: T.int({ default: 1 }),
  unit_price: T.decimal({ required: true }),
  total_price: T.decimal({ required: true }),
  order_mode: T.enumOf(['offline', 'online'], { default: 'offline' }),
  payment_mode: T.enumOf(['cash', 'upi', 'card', 'razorpay'], { default: 'cash' }),
  transaction_id: T.string(),
  order_id: T.string(),
  sold_by: T.uuid(),
  sale_date: T.dateOnly(),
  status: T.enumOf(['pending', 'shipped', 'delivered', 'cancelled'], { required: true, default: 'pending' }),
});
ProductSaleSchema.index({ shop_id: 1 });
ProductSaleSchema.index({ product_id: 1 });
ProductSaleSchema.index({ sale_date: 1 });
// Idempotency guardrail: an order's line items can only be recorded once,
// even under concurrent duplicate purchase confirmations.
ProductSaleSchema.index(
  { order_id: 1, product_id: 1 },
  { unique: true, partialFilterExpression: { order_id: { $type: 'string' } } },
);

export const ProductSale = { name: 'ProductSale', schema: ProductSaleSchema };
