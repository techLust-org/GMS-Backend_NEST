import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ShopSubscription, ShopSubscriptionPlan, Shop } from '../models';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

@Module({
  imports: [SequelizeModule.forFeature([ShopSubscription, ShopSubscriptionPlan, Shop])],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
