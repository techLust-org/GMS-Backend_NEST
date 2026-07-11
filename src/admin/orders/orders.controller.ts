import { Controller, Get, Patch, Body, Param, Query, HttpCode, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, ShopId } from '../../common/decorators';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('admin')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(@ShopId() shopId: string, @Query() query: any) {
    return this.ordersService.list(shopId, query);
  }

  @Patch(':orderKey/status')
  @HttpCode(200)
  updateStatus(@ShopId() shopId: string, @Param('orderKey') orderKey: string, @Body() body: any) {
    return this.ordersService.updateStatus(shopId, orderKey, body);
  }
}
