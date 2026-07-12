import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ShopSubscription, ShopSubscriptionPlan, Shop, PendingPayment } from '../models';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

@Module({
  imports: [SequelizeModule.forFeature([ShopSubscription, ShopSubscriptionPlan, Shop, PendingPayment])],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
