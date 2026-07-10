import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppError } from '../app-error';

// Port of middleware/auth.js
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }
    const token = header.split(' ')[1];
    try {
      req.user = this.jwt.verify(token);
      return true;
    } catch {
      throw new AppError('Invalid or expired token', 401);
    }
  }
}
