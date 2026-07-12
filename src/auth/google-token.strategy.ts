import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GoogleTokenStrategy = require('passport-google-id-token');

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  picture: string | null;
}

// Verifies a Google ID token obtained natively on the client (via the
// google_sign_in Flutter package) — not the browser-redirect OAuth2 flow.
// clientID accepts a comma-separated list in GOOGLE_CLIENT_ID since Android/
// iOS/Web builds are typically issued separate OAuth client IDs by Google,
// all of which must be accepted as valid audiences.
@Injectable()
export class GoogleAuthStrategy extends PassportStrategy(GoogleTokenStrategy, 'google-id-token') {
  constructor() {
    const clientIds = (process.env.GOOGLE_CLIENT_ID || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    super({ clientID: clientIds.length > 1 ? clientIds : clientIds[0] });
  }

  // passport-google-id-token calls verify(parsedToken, googleId, done) — the
  // 2-arg form here (no `done`) lets the @nestjs/passport mixin auto-resolve
  // this return value into req.user instead.
  async validate(parsedToken: any, googleId: string): Promise<GoogleProfile> {
    const payload = parsedToken.payload || {};
    const nameParts = String(payload.name || '').trim().split(/\s+/);
    return {
      googleId,
      email: payload.email,
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      firstName: payload.given_name || nameParts[0] || 'Member',
      lastName: payload.family_name || nameParts.slice(1).join(' ') || '',
      picture: payload.picture || null,
    };
  }
}
