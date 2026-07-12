import { Controller, Get, Post, Body, Query, HttpCode, UseGuards } from '@nestjs/common';
import { MemberShopService } from './shop.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, ShopId, CurrentUser } from '../../common/decorators';

@Controller('member/shop')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('member', 'trainer')
export class MemberShopController {
  constructor(private readonly shopService: MemberShopService) {}

  @Get()
  listProducts(@ShopId() shopId: string, @Query() query: any) {
    return this.shopService.listProducts(shopId, query);
  }

  @Post('create-order')
  @HttpCode(200)
  createOrder(@ShopId() shopId: string, @CurrentUser('id') userId: string, @Body() body: any) {
    return this.shopService.createOrder(shopId, userId, body);
  }

  @Post('purchase')
  @HttpCode(201)
  purchase(@ShopId() shopId: string, @CurrentUser('id') userId: string, @Body() body: any) {
    return this.shopService.purchase(shopId, userId, body);
  }

  @Get('orders')
  myOrders(@ShopId() shopId: string, @CurrentUser('id') userId: string) {
    return this.shopService.myOrders(shopId, userId);
  }
}
