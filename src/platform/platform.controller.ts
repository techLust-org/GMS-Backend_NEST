import { Controller, Get, Post, Body, HttpCode, UseGuards } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles, ShopId, ResponseMessage } from '../common/decorators';

// Owners manage their platform subscription here. Intentionally NOT gated by
// ActiveShopGuard so an owner with a lapsed subscription can still renew.
@Controller('platform')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles('admin')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('plans')
  listPlans() {
    return this.platformService.listPlans();
  }

  @Get('subscription')
  getSubscription(@ShopId() shopId: string) {
    return this.platformService.getSubscription(shopId);
  }

  @Post('create-order')
  @HttpCode(200)
  createOrder(@ShopId() shopId: string, @Body() body: any) {
    return this.platformService.createOrder(shopId, body);
  }

  @Post('activate')
  @HttpCode(201)
  @ResponseMessage('Platform subscription activated')
  activate(@ShopId() shopId: string, @Body() body: any) {
    return this.platformService.activate(shopId, body);
  }
}
