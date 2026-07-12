import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

// Gracefully degrades to a no-op (like MailService) when Firebase creds
// aren't configured — push notifications are a supplement to the in-app
// notification list, never a hard dependency.
@Injectable()
export class PushService {
  private readonly logger = new Logger('Push');
  private app: admin.app.App | null = null;
  private initAttempted = false;

  private getApp(): admin.app.App | null {
    if (this.initAttempted) return this.app;
    this.initAttempted = true;

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('Firebase credentials not configured — push notifications disabled');
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

  // Returns the reason a token should be cleared (e.g. uninstalled app),
  // or null if the send succeeded or failed for an unrelated/transient reason.
  async sendToToken(
    token: string,
    title: string,
    body: string,
    data: Record<string, string> = {},
  ): Promise<{ sent: boolean; shouldClearToken: boolean }> {
    const app = this.getApp();
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
