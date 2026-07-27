import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { AppError } from '../common/app-error';
import { OtpService } from './otp.service';

// Single shared Firebase Admin app instance — admin.initializeApp() can only
// be called once per process, so both PushService (FCM) and phone-auth
// token verification (AuthService / PublicShopsService) go through this one
// lazy getter instead of each trying to initialize their own.
@Injectable()
export class FirebaseAdminService {
  private readonly logger = new Logger('FirebaseAdmin');
  private app: admin.app.App | null = null;
  private initAttempted = false;

  constructor(private readonly otp: OtpService) {}

  getApp(): admin.app.App | null {
    if (this.initAttempted) return this.app;
    this.initAttempted = true;

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('Firebase credentials not configured');
      return null;
    }

    this.app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        // .env stores the key with literal "\n" sequences — restore real newlines.
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    return this.app;
  }

  // Verifies a Firebase Phone Auth ID token (minted client-side by
  // firebase_auth after the user confirms an SMS code) and returns the
  // phone number, normalized the same way OtpService normalizes
  // WhatsApp-OTP-verified numbers — so both auth methods land on and match
  // the same stored value for a given user.
  async verifyPhoneToken(idToken: string): Promise<string> {
    if (!idToken) throw new AppError('idToken is required', 400);
    const app = this.getApp();
    if (!app) throw new AppError('Phone sign-in is not configured on the server', 503);

    let decoded: { phone_number?: string };
    try {
      decoded = await app.auth().verifyIdToken(idToken);
    } catch {
      throw new AppError('Invalid or expired phone verification', 401);
    }
    if (!decoded.phone_number) {
      throw new AppError('This sign-in method did not verify a phone number', 400);
    }
    return this.otp.normalizePhone(decoded.phone_number);
  }
}
