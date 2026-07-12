import { Controller, Get, Put, Patch, Post, Delete, Body, UseGuards } from '@nestjs/common';
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
  getProfile(@ShopId() shopId: string) {
    return this.shopService.getProfile(shopId);
  }

  @Put()
  updateProfile(@ShopId() shopId: string, @Body() body: any) {
    return this.shopService.updateProfile(shopId, body);
  }

  @Post('logo/presign')
  presignLogo(@ShopId() shopId: string, @Body() body: any) {
    return this.shopService.presignLogo(shopId, body);
  }

  @Put('logo')
  updateLogo(@ShopId() shopId: string, @Body() body: any) {
    return this.shopService.updateLogo(shopId, body);
  }

  @Delete('logo')
  removeLogo(@ShopId() shopId: string) {
    return this.shopService.removeLogo(shopId);
  }

  @Post('cover/presign')
  presignCover(@ShopId() shopId: string, @Body() body: any) {
    return this.shopService.presignCover(shopId, body);
  }

  @Put('cover')
  updateCover(@ShopId() shopId: string, @Body() body: any) {
    return this.shopService.updateCover(shopId, body);
  }

  @Delete('cover')
  removeCover(@ShopId() shopId: string) {
    return this.shopService.removeCover(shopId);
  }

  @Patch('closed')
  setClosed(@ShopId() shopId: string, @Body() body: any) {
    return this.shopService.setClosed(shopId, body);
  }
}
