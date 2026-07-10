import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ShopSubscriptionPlan } from '../models';

// Public — platform plans we sell to gym owners (for the marketing/landing view)
@Controller()
export class PublicController {
  constructor(
    @InjectModel(ShopSubscriptionPlan) private readonly shopSubscriptionPlan: typeof ShopSubscriptionPlan,
  ) {}

  @Get('plans')
  plans() {
    return this.shopSubscriptionPlan.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'plan_type', 'duration_days', 'base_price', 'discount', 'sell_price', 'description'],
      order: [['sell_price', 'ASC']],
    });
  }
}
