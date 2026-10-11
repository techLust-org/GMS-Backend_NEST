import { defineSchema, T } from './schema-helpers';

// A short-lived, single-use OTP sent to a phone number over WhatsApp —
// purely proves "this phone number answered a code sent to it"; it carries
// no notion of login vs. registration. The caller (AuthService /
// PublicShopsService) decides what to do once verifyAndConsume succeeds.
export const OtpRequestSchema = defineSchema('otp_requests', {
  phone: T.string({ required: true }),
  code_hash: T.string({ required: true }),
  attempts: T.int({ required: true, default: 0 }),
  expires_at: T.date({ required: true }),
  consumed_at: T.date(),
});
OtpRequestSchema.index({ phone: 1 });

export const OtpRequest = { name: 'OtpRequest', schema: OtpRequestSchema };
