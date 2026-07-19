import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ShopSubscription, ShopSubscriptionPlan, Shop, PendingPayment, Referral } from '../models';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

@Module({
  imports: [SequelizeModule.forFeature([ShopSubscription, ShopSubscriptionPlan, Shop, PendingPayment, Referral])],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
