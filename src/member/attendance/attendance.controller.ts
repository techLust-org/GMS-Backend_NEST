import { Controller, Get, Post, Put, Query, HttpCode, UseGuards } from '@nestjs/common';
import { MemberAttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, ShopId, CurrentUser } from '../../common/decorators';

@Controller('member/attendance')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('member', 'trainer')
export class MemberAttendanceController {
  constructor(private readonly attendanceService: MemberAttendanceService) {}

  @Get()
  history(@ShopId() shopId: string, @CurrentUser('id') userId: string, @Query() query: any) {
    return this.attendanceService.history(shopId, userId, query);
  }

  @Get('today')
  today(@ShopId() shopId: string, @CurrentUser('id') userId: string) {
    return this.attendanceService.today(shopId, userId);
  }

  @Post('check-in')
  @HttpCode(201)
  checkIn(@ShopId() shopId: string, @CurrentUser('id') userId: string) {
    return this.attendanceService.checkIn(shopId, userId);
  }

  @Put('check-out')
  checkOut(@ShopId() shopId: string, @CurrentUser('id') userId: string) {
    return this.attendanceService.checkOut(shopId, userId);
  }
}
