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
      secret: (() => {
        const secret = process.env.JWT_SECRET;
        if (!secret || secret === 'fallback_secret') {
          throw new Error('FATAL: JWT_SECRET environment variable must be set to a strong, unique value');
        }
        return secret;
      })(),
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d', algorithm: 'HS256' },
      verifyOptions: { algorithms: ['HS256'] },
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
