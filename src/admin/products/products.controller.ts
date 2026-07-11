import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, ShopId, CurrentUser } from '../../common/decorators';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('admin')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  list(@ShopId() shopId: string, @Query() query: any) {
    return this.productsService.list(shopId, query);
  }

  @Post()
  @HttpCode(201)
  create(@ShopId() shopId: string, @Body() body: any) {
    return this.productsService.create(shopId, body);
  }

  // Declared before ':id' so "sales" isn't captured as an id param.
  @Get('sales')
  getSales(@ShopId() shopId: string, @Query() query: any) {
    return this.productsService.getSales(shopId, query);
  }

  @Post('sales')
  @HttpCode(201)
  recordSale(@ShopId() shopId: string, @CurrentUser('id') userId: string, @Body() body: any) {
    return this.productsService.recordSale(shopId, userId, body);
  }

  @Get(':id')
  get(@ShopId() shopId: string, @Param('id') id: string) {
    return this.productsService.get(shopId, id);
  }

  @Put(':id')
  update(@ShopId() shopId: string, @Param('id') id: string, @Body() body: any) {
    return this.productsService.update(shopId, id, body);
  }

  @Delete(':id')
  remove(@ShopId() shopId: string, @Param('id') id: string) {
    return this.productsService.remove(shopId, id);
  }

  @Post(':id/restock')
  @HttpCode(200)
  restock(@ShopId() shopId: string, @Param('id') id: string, @Body() body: any) {
    return this.productsService.restock(shopId, id, body);
  }
}
