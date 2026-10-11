import { defineSchema, T } from './schema-helpers';

// One row per referred shop. status flips pending -> successful the moment
// the referred shop activates its first-ever platform subscription.
// redeemed_at marks this referral as already spent toward a past reward
// redemption, so it's excluded from future eligibility counts.
export const ReferralSchema = defineSchema('referrals', {
  referrer_shop_id: T.uuid({ required: true }),
  referred_shop_id: T.uuid({ required: true }),
  status: T.enumOf(['pending', 'successful'], { required: true, default: 'pending' }),
  converted_at: T.date(),
  redeemed_at: T.date(),
});
ReferralSchema.index({ referred_shop_id: 1 }, { unique: true });
ReferralSchema.index({ referrer_shop_id: 1 });
ReferralSchema.index({ status: 1 });

export const Referral = { name: 'Referral', schema: ReferralSchema };
