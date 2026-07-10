import { Controller, Get, UseGuards } from '@nestjs/common';
import { MemberPlansService } from './plans.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, CurrentUser } from '../../common/decorators';

@Controller('member')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('member')
export class MemberPlansController {
  constructor(private readonly plansService: MemberPlansService) {}

  @Get('payments')
  payments(@CurrentUser('id') userId: number) {
    return this.plansService.payments(userId);
  }

  @Get('workout-plans/active')
  activeWorkoutPlan(@CurrentUser('id') userId: number) {
    return this.plansService.activeWorkoutPlan(userId);
  }

  @Get('diet-plans/active')
  activeDietPlan(@CurrentUser('id') userId: number) {
    return this.plansService.activeDietPlan(userId);
  }
}
