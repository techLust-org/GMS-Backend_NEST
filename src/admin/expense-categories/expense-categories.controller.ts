import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, UseGuards } from '@nestjs/common';
import { ExpenseCategoriesService } from './expense-categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, ShopId } from '../../common/decorators';

@Controller('admin/expense-categories')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('admin')
export class ExpenseCategoriesController {
  constructor(private readonly expenseCategoriesService: ExpenseCategoriesService) {}

  @Get()
  list(@ShopId() shopId: number) {
    return this.expenseCategoriesService.list(shopId);
  }

  @Post()
  @HttpCode(201)
  create(@ShopId() shopId: number, @Body() body: any) {
    return this.expenseCategoriesService.create(shopId, body);
  }

  @Put(':id')
  update(@ShopId() shopId: number, @Param('id') id: string, @Body() body: any) {
    return this.expenseCategoriesService.update(shopId, +id, body);
  }

  @Delete(':id')
  remove(@ShopId() shopId: number, @Param('id') id: string) {
    return this.expenseCategoriesService.remove(shopId, +id);
  }
}
