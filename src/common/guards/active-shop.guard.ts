import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ShopSubscription } from '../../models';

// Port of middleware/requireActiveShop.js. 402 SHOP_INACTIVE gate.
@Injectable()
export class ActiveShopGuard implements CanActivate {
  constructor(
    @InjectModel(ShopSubscription.name) private readonly shopSubscription: Model<any>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (req.user.role === 'super_admin') return true;

    const shopId = req.user.shop_id;
    if (!shopId) {
      throw new HttpException(
        { success: false, code: 'SHOP_INACTIVE', message: 'No shop subscription found' },
        402,
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const sub = await this.shopSubscription.findOne({
      shop_id: shopId, status: 'active', end_date: { $gte: today },
    });

    if (!sub) {
      throw new HttpException(
        {
          success: false,
          code: 'SHOP_INACTIVE',
          message: "Your gym's platform subscription is inactive. Please renew to continue.",
        },
        402,
      );
    }
    return true;
  }
}
