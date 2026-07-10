import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AppError } from '../app-error';

// Port of middleware/tenant.js. Attaches req.shopId (null for super_admin).
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (req.user.role === 'super_admin') {
      req.shopId = null;
      return true;
    }
    if (!req.user.shop_id) {
      throw new AppError('No shop associated with this account', 403);
    }
    req.shopId = req.user.shop_id;
    return true;
  }
}
