import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, UseGuards } from '@nestjs/common';
import { TrainerAbsenceService } from './absence.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, ShopId, CurrentUser } from '../../common/decorators';

@Controller('trainer/absences')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('trainer')
export class TrainerAbsenceController {
  constructor(private readonly absenceService: TrainerAbsenceService) {}

  @Get()
  list(
    @ShopId() shopId: string,
    @CurrentUser('id') trainerId: string,
    @Query() query: any,
  ) {
    return this.absenceService.list(shopId, trainerId, query);
  }

  @Post()
  @HttpCode(201)
  create(@ShopId() shopId: string, @CurrentUser('id') trainerId: string, @Body() body: any) {
    return this.absenceService.create(shopId, trainerId, body);
  }

  @Delete(':id')
  remove(@ShopId() shopId: string, @CurrentUser('id') trainerId: string, @Param('id') id: string) {
    return this.absenceService.remove(shopId, trainerId, id);
  }
}
