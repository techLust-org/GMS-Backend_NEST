import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, UseGuards,
} from '@nestjs/common';
import { AdminFinancialService } from './financial.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, ShopId } from '../../common/decorators';

@Controller('admin/financial')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('admin')
export class AdminFinancialController {
  constructor(private readonly financialService: AdminFinancialService) {}

  @Get('summary')
  summary(@ShopId() shopId: number, @Query() query: any) {
    return this.financialService.summary(shopId, query);
  }

  @Get('monthly-report')
  monthlyReport(@ShopId() shopId: number, @Query() query: any) {
    return this.financialService.monthlyReport(shopId, query);
  }

  @Get('revenue')
  revenue(@ShopId() shopId: number, @Query() query: any) {
    return this.financialService.revenue(shopId, query);
  }

  @Get('expenses')
  getExpenses(@ShopId() shopId: number, @Query() query: any) {
    return this.financialService.getExpenses(shopId, query);
  }

  @Post('expenses')
  @HttpCode(201)
  createExpense(@ShopId() shopId: number, @Body() body: any) {
    return this.financialService.createExpense(shopId, body);
  }

  @Put('expenses/:id')
  updateExpense(@ShopId() shopId: number, @Param('id') id: string, @Body() body: any) {
    return this.financialService.updateExpense(shopId, +id, body);
  }

  @Delete('expenses/:id')
  deleteExpense(@ShopId() shopId: number, @Param('id') id: string) {
    return this.financialService.deleteExpense(shopId, +id);
  }
}
