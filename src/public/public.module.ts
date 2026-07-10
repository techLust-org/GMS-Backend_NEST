import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ShopSubscriptionPlan } from '../models';
import { PublicController } from './public.controller';

@Module({
  imports: [SequelizeModule.forFeature([ShopSubscriptionPlan])],
  controllers: [PublicController],
})
export class PublicModule {}
