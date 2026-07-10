import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, UseGuards } from '@nestjs/common';
import { MemberPlansService } from './member-plans.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, ShopId } from '../../common/decorators';

@Controller('admin/member-plans')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('admin')
export class MemberPlansController {
  constructor(private readonly memberPlansService: MemberPlansService) {}

  @Get()
  list(@ShopId() shopId: number) {
    return this.memberPlansService.list(shopId);
  }

  @Post()
  @HttpCode(201)
  create(@ShopId() shopId: number, @Body() body: any) {
    return this.memberPlansService.create(shopId, body);
  }

  @Put(':id')
  update(@ShopId() shopId: number, @Param('id') id: string, @Body() body: any) {
    return this.memberPlansService.update(shopId, +id, body);
  }

  @Delete(':id')
  remove(@ShopId() shopId: number, @Param('id') id: string) {
    return this.memberPlansService.remove(shopId, +id);
  }
}
