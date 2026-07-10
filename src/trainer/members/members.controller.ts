import {
  Controller, Get, Post, Delete, Param, Query, HttpCode, UseGuards,
} from '@nestjs/common';
import { TrainerMembersService } from './members.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, ShopId, CurrentUser } from '../../common/decorators';

@Controller('trainer/members')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('trainer')
export class TrainerMembersController {
  constructor(private readonly membersService: TrainerMembersService) {}

  @Get()
  myMembers(@ShopId() shopId: number, @CurrentUser('id') trainerId: number) {
    return this.membersService.myMembers(shopId, trainerId);
  }

  @Get('available')
  availableMembers(@ShopId() shopId: number, @Query() query: any) {
    return this.membersService.availableMembers(shopId, query);
  }

  @Post(':id/assign')
  @HttpCode(201)
  assign(@ShopId() shopId: number, @CurrentUser('id') trainerId: number, @Param('id') id: string) {
    return this.membersService.assign(shopId, trainerId, +id);
  }

  @Delete(':id/assign')
  unassign(@ShopId() shopId: number, @CurrentUser('id') trainerId: number, @Param('id') id: string) {
    return this.membersService.unassign(shopId, trainerId, +id);
  }

  @Get(':id/attendance')
  memberAttendance(
    @ShopId() shopId: number,
    @CurrentUser('id') trainerId: number,
    @Param('id') id: string,
    @Query() query: any,
  ) {
    return this.membersService.memberAttendance(shopId, trainerId, +id, query);
  }
}
