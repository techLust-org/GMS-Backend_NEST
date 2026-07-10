import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { User, Role, Shop } from '../models';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [SequelizeModule.forFeature([User, Role, Shop])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
