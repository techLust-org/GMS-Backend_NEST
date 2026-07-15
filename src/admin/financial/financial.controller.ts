import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Res, HttpCode, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AdminFinancialService } from './financial.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, ShopId, RawResponse } from '../../common/decorators';

@Controller('admin/financial')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('admin')
export class AdminFinancialController {
  constructor(private readonly financialService: AdminFinancialService) {}

  @Get('summary')
  summary(@ShopId() shopId: string, @Query() query: any) {
    return this.financialService.summary(shopId, query);
  }

  @Get('monthly-report')
  monthlyReport(@ShopId() shopId: string, @Query() query: any) {
    return this.financialService.monthlyReport(shopId, query);
  }

  @Get('revenue')
  revenue(@ShopId() shopId: string, @Query() query: any) {
    return this.financialService.revenue(shopId, query);
  }

  @Get('expenses')
  getExpenses(@ShopId() shopId: string, @Query() query: any) {
    return this.financialService.getExpenses(shopId, query);
  }

  @Get('expenses/export')
  @RawResponse()
  exportExpenses(@ShopId() shopId: string, @Query() query: any, @Res() res: Response) {
    return this.financialService.exportExpenses(shopId, query, res);
  }

  @Post('expenses')
  @HttpCode(201)
  createExpense(@ShopId() shopId: string, @Body() body: any) {
    return this.financialService.createExpense(shopId, body);
  }

  @Put('expenses/:id')
  updateExpense(@ShopId() shopId: string, @Param('id') id: string, @Body() body: any) {
    return this.financialService.updateExpense(shopId, id, body);
  }

  @Delete('expenses/:id')
  deleteExpense(@ShopId() shopId: string, @Param('id') id: string) {
    return this.financialService.deleteExpense(shopId, id);
  }
}
