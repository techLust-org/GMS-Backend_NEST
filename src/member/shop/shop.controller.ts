import { Controller, Get, Post, Body, Query, HttpCode, UseGuards } from '@nestjs/common';
import { MemberShopService } from './shop.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, ShopId, CurrentUser } from '../../common/decorators';

@Controller('member/shop')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('member')
export class MemberShopController {
  constructor(private readonly shopService: MemberShopService) {}

  @Get()
  listProducts(@ShopId() shopId: number, @Query() query: any) {
    return this.shopService.listProducts(shopId, query);
  }

  @Post('create-order')
  @HttpCode(200)
  createOrder(@ShopId() shopId: number, @Body() body: any) {
    return this.shopService.createOrder(shopId, body);
  }

  @Post('purchase')
  @HttpCode(201)
  purchase(@ShopId() shopId: number, @CurrentUser('id') userId: number, @Body() body: any) {
    return this.shopService.purchase(shopId, userId, body);
  }

  @Get('orders')
  myOrders(@ShopId() shopId: number, @CurrentUser('id') userId: number) {
    return this.shopService.myOrders(shopId, userId);
  }
}
