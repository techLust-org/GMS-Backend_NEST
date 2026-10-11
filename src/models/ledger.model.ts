import { defineSchema, T } from './schema-helpers';

// Backend-only cashflow log per shop.
export const LedgerSchema = defineSchema('ledger', {
  shop_id: T.uuid({ required: true }),
  type: T.enumOf(['credit', 'debit'], { required: true }),
  amount: T.decimal({ required: true }),
  reference: T.string(),
  reference_id: T.uuid(),
  entry_date: T.dateOnly(),
});
LedgerSchema.index({ shop_id: 1, entry_date: 1 });
LedgerSchema.index({ shop_id: 1, reference: 1, reference_id: 1 });

export const Ledger = { name: 'Ledger', schema: LedgerSchema };
