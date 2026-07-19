import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PassportModule } from '@nestjs/passport';
import { User, Role, Shop, Referral } from '../models';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthStrategy } from './google-token.strategy';

@Module({
  imports: [SequelizeModule.forFeature([User, Role, Shop, Referral]), PassportModule],
  controllers: [AuthController],
  providers: [AuthService, GoogleAuthStrategy],
})
export class AuthModule {}
