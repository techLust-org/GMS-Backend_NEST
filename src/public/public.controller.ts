import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ShopSubscriptionPlan } from '../models';

// Public — platform plans we sell to gym owners (for the marketing/landing view)
@Controller()
export class PublicController {
  constructor(
    @InjectModel(ShopSubscriptionPlan.name) private readonly shopSubscriptionPlan: Model<any>,
  ) {}

  @Get('plans')
  plans() {
    return this.shopSubscriptionPlan
      .find({ is_active: true })
      .select('name plan_type duration_days base_price discount sell_price description')
      .sort({ sell_price: 1 });
  }
}
