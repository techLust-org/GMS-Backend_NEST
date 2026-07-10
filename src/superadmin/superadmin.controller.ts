import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, HttpCode, UseGuards,
} from '@nestjs/common';
import { SuperadminService } from './superadmin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, CurrentUser } from '../common/decorators';

// Platform control plane — only the seeded super_admin may touch these.
@Controller('superadmin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class SuperadminController {
  constructor(private readonly superadminService: SuperadminService) {}

  @Get('stats')
  stats() {
    return this.superadminService.stats();
  }

  // Shops (tenants)
  @Get('shops')
  listShops(@Query() query: any) {
    return this.superadminService.listShops(query);
  }

  @Get('shops/:id')
  shopDetail(@Param('id') id: string) {
    return this.superadminService.shopDetail(+id);
  }

  @Post('shops/:id/grant')
  @HttpCode(201)
  grant(@Param('id') id: string, @Body() body: any) {
    return this.superadminService.grant(+id, body);
  }

  @Post('shops/:id/revoke')
  @HttpCode(200)
  revoke(@Param('id') id: string) {
    return this.superadminService.revoke(+id);
  }

  @Post('shops/:id/extend')
  @HttpCode(200)
  extend(@Param('id') id: string, @Body() body: any) {
    return this.superadminService.extend(+id, body);
  }

  @Patch('shops/:id/owner-status')
  setOwnerStatus(@Param('id') id: string, @Body() body: any) {
    return this.superadminService.setOwnerStatus(+id, body);
  }

  @Post('shops/:id/notify-renewal')
  @HttpCode(200)
  notifyRenewal(@Param('id') id: string) {
    return this.superadminService.notifyRenewal(+id);
  }

  // Platform plans
  @Get('plans')
  listPlans() {
    return this.superadminService.listPlans();
  }

  @Post('plans')
  @HttpCode(201)
  createPlan(@Body() body: any) {
    return this.superadminService.createPlan(body);
  }

  @Put('plans/:id')
  updatePlan(@Param('id') id: string, @Body() body: any) {
    return this.superadminService.updatePlan(+id, body);
  }

  @Delete('plans/:id')
  deletePlan(@Param('id') id: string) {
    return this.superadminService.deletePlan(+id);
  }

  // Revenue / subscriptions log
  @Get('subscriptions')
  listSubscriptions() {
    return this.superadminService.listSubscriptions();
  }

  // Account
  @Put('change-password')
  changePassword(@CurrentUser('id') userId: number, @Body() body: any) {
    return this.superadminService.changePassword(userId, body);
  }
}
