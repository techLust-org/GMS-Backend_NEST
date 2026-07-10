import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AdminShopService } from './shop.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, ShopId } from '../../common/decorators';

@Controller('admin/shop')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('admin')
export class AdminShopController {
  constructor(private readonly shopService: AdminShopService) {}

  @Get()
  getProfile(@ShopId() shopId: number) {
    return this.shopService.getProfile(shopId);
  }

  @Put()
  updateProfile(@ShopId() shopId: number, @Body() body: any) {
    return this.shopService.updateProfile(shopId, body);
  }
}
