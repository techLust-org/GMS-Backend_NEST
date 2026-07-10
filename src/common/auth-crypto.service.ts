import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

// Port of services/auth.service.js. sign/verify use the globally-configured
// JwtModule (same JWT_SECRET / JWT_EXPIRES_IN as the Express app).
@Injectable()
export class AuthCryptoService {
  constructor(private readonly jwt: JwtService) {}

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  sign(payload: Record<string, any>): string {
    return this.jwt.sign(payload);
  }

  verify(token: string): any {
    return this.jwt.verify(token);
  }
}
