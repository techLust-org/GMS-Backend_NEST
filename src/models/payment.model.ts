import { defineSchema, T, todayDateOnly } from './schema-helpers';

export const PaymentSchema = defineSchema('payments', {
  shop_id: T.uuid({ required: true }),
  member_id: T.uuid({ required: true }),
  subscription_id: T.uuid(),
  product_sale_id: T.uuid(),
  amount: T.decimal({ required: true }),
  payment_date: T.dateOnly({ default: todayDateOnly }),
  payment_method: T.string({ default: 'cash' }),
  notes: T.text(),
});
PaymentSchema.index({ shop_id: 1 });
PaymentSchema.index({ member_id: 1 });
PaymentSchema.index({ payment_date: 1 });

export const Payment = { name: 'Payment', schema: PaymentSchema };
