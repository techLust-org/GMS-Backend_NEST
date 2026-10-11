import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OtpRequest } from '../models';
import { AuthCryptoService } from '../common/auth-crypto.service';
import { WhatsAppService } from './whatsapp.service';
import { AppError } from '../common/app-error';

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

// Generates, delivers (via WhatsApp) and verifies one-time codes proving
// ownership of a phone number. Deliberately purpose-agnostic — it doesn't
// know or care whether the caller is about to log in or register; that
// decision belongs to AuthService / PublicShopsService once a code is
// successfully verified.
@Injectable()
export class OtpService {
  constructor(
    @InjectModel(OtpRequest.name) private readonly otpRequest: Model<any>,
    private readonly auth: AuthCryptoService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  // Digits only — WhatsApp Cloud API expects country code + number with no
  // '+', spaces, or punctuation.
  normalizePhone(rawPhone: string): string {
    return String(rawPhone || '').replace(/\D/g, '');
  }

  async sendOtp(rawPhone: string): Promise<{ sent: boolean; devCode?: string }> {
    const phone = this.normalizePhone(rawPhone);
    if (phone.length < 8) throw new AppError('Enter a valid phone number with country code', 400);

    const recent: any = await this.otpRequest
      .findOne({ phone, consumed_at: null })
      .sort({ createdAt: -1 });
    if (recent && Date.now() - new Date(recent.createdAt).getTime() < RESEND_COOLDOWN_MS) {
      throw new AppError('Please wait a minute before requesting another code', 429);
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const code_hash = await this.auth.hash(code);
    const expires_at = new Date(Date.now() + OTP_TTL_MS);
    await this.otpRequest.create({ phone, code_hash, expires_at });

    const sent = await this.whatsapp.sendOtp(phone, code);
    // Only return the code in explicitly marked dev/test environments — never
    // in production or any other (possibly internet-facing) environment.
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    const devCode = !sent && isDev ? code : undefined;
    return { sent, devCode };
  }

  // Returns the normalized phone number once the code checks out — the
  // caller uses that to look up/create the User.
  async verifyAndConsume(rawPhone: string, code: string): Promise<string> {
    const phone = this.normalizePhone(rawPhone);
    const record: any = await this.otpRequest
      .findOne({ phone, consumed_at: null })
      .sort({ createdAt: -1 });
    if (!record) throw new AppError('No OTP request found for this number. Request a new code.', 400);
    if (new Date(record.expires_at) < new Date()) {
      throw new AppError('Code expired. Request a new one.', 400);
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      throw new AppError('Too many incorrect attempts. Request a new code.', 429);
    }

    const valid = await this.auth.compare(code, record.code_hash);
    if (!valid) {
      await this.otpRequest.updateOne({ _id: record.id }, { $inc: { attempts: 1 } });
      throw new AppError('Incorrect code', 400);
    }

    await record.set({ consumed_at: new Date() }).save();
    return phone;
  }
}
