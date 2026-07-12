import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ShopSubscriptionPlan, Shop, SubscriptionPlan, Role, User } from '../models';
import { PublicController } from './public.controller';
import { PublicShopsController } from './shops.controller';
import { PublicShopsService } from './shops.service';

@Module({
  imports: [
    SequelizeModule.forFeature([ShopSubscriptionPlan, Shop, SubscriptionPlan, Role, User]),
  ],
  controllers: [PublicController, PublicShopsController],
  providers: [PublicShopsService],
})
export class PublicModule {}
