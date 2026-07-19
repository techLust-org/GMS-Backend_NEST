import { randomBytes } from 'crypto';
import { AppError } from './app-error';

// Unambiguous character set (no 0/O/1/I) — referral codes are meant to be
// read aloud and hand-typed over WhatsApp/SMS, same reasoning as the
// superadmin temp-password generator.
const REFERRAL_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomReferralCode(length = 8): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += REFERRAL_CODE_CHARS[bytes[i] % REFERRAL_CODE_CHARS.length];
  return out;
}

// Generates a code guaranteed unique against the shops table at this
// moment. Takes the Shop model itself (not injected) so it's callable from
// any service without its own DI wiring.
export async function generateUniqueReferralCode(shopModel: any, transaction?: any): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomReferralCode();
    const existing = await shopModel.findOne({ where: { referral_code: code }, transaction });
    if (!existing) return code;
  }
  throw new AppError('Could not generate a unique referral code, please retry', 500);
}
