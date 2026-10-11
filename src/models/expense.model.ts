import { defineSchema, T } from './schema-helpers';

export const ExpenseSchema = defineSchema('expenses', {
  shop_id: T.uuid({ required: true }),
  category_id: T.uuid({ required: true }),
  description: T.string({ required: true }),
  amount: T.decimal({ required: true }),
  expense_date: T.dateOnly(),
  paid_to: T.string(),
  trainer_id: T.uuid(),
  invoice_url: T.text(),
  product_sale_id: T.uuid(),
});
ExpenseSchema.index({ shop_id: 1 });
ExpenseSchema.index({ expense_date: 1 });
ExpenseSchema.index({ category_id: 1 });

export const Expense = { name: 'Expense', schema: ExpenseSchema };
