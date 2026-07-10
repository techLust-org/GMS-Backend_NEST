import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, ShopId } from '../../common/decorators';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@ShopId() shopId: number, @Query() query: any) {
    return this.usersService.list(shopId, query);
  }

  @Post()
  @HttpCode(201)
  create(@ShopId() shopId: number, @Body() body: any) {
    return this.usersService.create(shopId, body);
  }

  @Get(':id')
  get(@ShopId() shopId: number, @Param('id') id: string) {
    return this.usersService.get(shopId, +id);
  }

  @Put(':id')
  update(@ShopId() shopId: number, @Param('id') id: string, @Body() body: any) {
    return this.usersService.update(shopId, +id, body);
  }

  @Delete(':id')
  remove(@ShopId() shopId: number, @Param('id') id: string) {
    return this.usersService.remove(shopId, +id);
  }

  @Put(':id/status')
  setStatus(@ShopId() shopId: number, @Param('id') id: string, @Body() body: any) {
    return this.usersService.setStatus(shopId, +id, body);
  }

  @Post(':id/notify-renewal')
  @HttpCode(200)
  notifyRenewal(@ShopId() shopId: number, @Param('id') id: string) {
    return this.usersService.notifyRenewal(shopId, +id);
  }
}
