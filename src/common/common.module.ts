import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SequelizeModule } from '@nestjs/sequelize';
import { ShopSubscription } from '../models';
import { AuthCryptoService } from './auth-crypto.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { TenantGuard } from './guards/tenant.guard';
import { ActiveShopGuard } from './guards/active-shop.guard';

// Port of config/jwt.js
@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback_secret',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
    SequelizeModule.forFeature([ShopSubscription]),
  ],
  providers: [AuthCryptoService, JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard],
  exports: [
    JwtModule,
    AuthCryptoService,
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
    ActiveShopGuard,
    SequelizeModule,
  ],
})
export class CommonModule {}
