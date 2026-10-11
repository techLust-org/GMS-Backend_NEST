import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicShopsController } from './shops.controller';
import { PublicShopsService } from './shops.service';

@Module({
  controllers: [PublicController, PublicShopsController],
  providers: [PublicShopsService],
})
export class PublicModule {}
