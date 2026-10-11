import { defineSchema, T } from './schema-helpers';

// Server-resolved record of what a Razorpay order was actually created for.
// The confirm step (purchase/activate) must read the grant details back
// from here — never re-trust a client-resubmitted planId/items/amount at
// that point, since the payment signature alone doesn't prove they match
// what was paid for.
export const PendingPaymentSchema = defineSchema('pending_payments', {
  shop_id: T.uuid({ required: true }),
  user_id: T.uuid(),
  kind: T.string({ required: true }),
  razorpay_order_id: T.string({ required: true }),
  amount: T.decimal({ required: true }),
  payload: T.json({ required: true }),
  consumed_at: T.date(),
});
PendingPaymentSchema.index({ razorpay_order_id: 1 }, { unique: true });

export const PendingPayment = { name: 'PendingPayment', schema: PendingPaymentSchema };
