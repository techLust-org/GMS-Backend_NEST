import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseAdminService } from './firebase-admin.service';

// Gracefully degrades to a no-op (like MailService) when Firebase creds
// aren't configured — push notifications are a supplement to the in-app
// notification list, never a hard dependency.
@Injectable()
export class PushService {
  private readonly logger = new Logger('Push');

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  // Returns the reason a token should be cleared (e.g. uninstalled app),
  // or null if the send succeeded or failed for an unrelated/transient reason.
  async sendToToken(
    token: string,
    title: string,
    body: string,
    data: Record<string, string> = {},
  ): Promise<{ sent: boolean; shouldClearToken: boolean }> {
    const app = this.firebaseAdmin.getApp();
    if (!app) return { sent: false, shouldClearToken: false };

    try {
      await admin.messaging(app).send({
        token,
        notification: { title, body },
        data,
        android: { priority: 'high' },
      });
      return { sent: true, shouldClearToken: false };
    } catch (err: any) {
      const code = err?.errorInfo?.code || err?.code;
      const stale = code === 'messaging/registration-token-not-registered'
        || code === 'messaging/invalid-registration-token';
      if (!stale) this.logger.error(`Push send failed: ${err.message}`);
      return { sent: false, shouldClearToken: stale };
    }
  }
}
