import { defineSchema, T } from './schema-helpers';

export const ExpenseCategorySchema = defineSchema('expense_categories', {
  shop_id: T.uuid({ required: true }),
  name: T.string({ required: true }),
  type: T.enumOf(['credit', 'debit'], { required: true, default: 'debit' }),
});
ExpenseCategorySchema.index({ shop_id: 1 });

export const ExpenseCategory = { name: 'ExpenseCategory', schema: ExpenseCategorySchema };
