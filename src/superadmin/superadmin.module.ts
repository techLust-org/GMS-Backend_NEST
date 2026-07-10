import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import {
  Shop, ShopSubscription, ShopSubscriptionPlan, User, Role, Subscription, Product, Expense,
} from '../models';
import { SuperadminController } from './superadmin.controller';
import { SuperadminService } from './superadmin.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Shop, ShopSubscription, ShopSubscriptionPlan, User, Role, Subscription, Product, Expense,
    ]),
  ],
  controllers: [SuperadminController],
  providers: [SuperadminService],
})
export class SuperadminModule {}
