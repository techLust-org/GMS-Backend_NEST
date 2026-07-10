import {
  Controller, Get, Post, Put, Delete, Body, Param, HttpCode, UseGuards,
} from '@nestjs/common';
import { TrainerPlansService } from './plans.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, ShopId, CurrentUser } from '../../common/decorators';

// Shares the /trainer/members base path with TrainerMembersController — the
// nested plan sub-paths don't collide with assign/attendance.
@Controller('trainer/members')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('trainer')
export class TrainerPlansController {
  constructor(private readonly plansService: TrainerPlansService) {}

  // ─── Workout Plans ─────────────────────────────────────────────────────────
  @Get(':memberId/workout-plans')
  listWorkoutPlans(@CurrentUser('id') trainerId: number, @Param('memberId') memberId: string) {
    return this.plansService.listWorkoutPlans(trainerId, +memberId);
  }

  @Post(':memberId/workout-plans')
  @HttpCode(201)
  createWorkoutPlan(
    @CurrentUser('id') trainerId: number,
    @ShopId() shopId: number,
    @Param('memberId') memberId: string,
    @Body() body: any,
  ) {
    return this.plansService.createWorkoutPlan(trainerId, shopId, +memberId, body);
  }

  @Get(':memberId/workout-plans/:planId')
  getWorkoutPlan(
    @CurrentUser('id') trainerId: number,
    @Param('memberId') memberId: string,
    @Param('planId') planId: string,
  ) {
    return this.plansService.getWorkoutPlan(trainerId, +memberId, +planId);
  }

  @Put(':memberId/workout-plans/:planId')
  updateWorkoutPlan(
    @CurrentUser('id') trainerId: number,
    @Param('memberId') memberId: string,
    @Param('planId') planId: string,
    @Body() body: any,
  ) {
    return this.plansService.updateWorkoutPlan(trainerId, +memberId, +planId, body);
  }

  @Delete(':memberId/workout-plans/:planId')
  deleteWorkoutPlan(
    @CurrentUser('id') trainerId: number,
    @Param('memberId') memberId: string,
    @Param('planId') planId: string,
  ) {
    return this.plansService.deleteWorkoutPlan(trainerId, +memberId, +planId);
  }

  @Post(':memberId/workout-plans/:planId/days')
  @HttpCode(201)
  addWorkoutDay(
    @CurrentUser('id') trainerId: number,
    @Param('memberId') memberId: string,
    @Param('planId') planId: string,
    @Body() body: any,
  ) {
    return this.plansService.addWorkoutDay(trainerId, +memberId, +planId, body);
  }

  @Put(':memberId/workout-plans/:planId/days/:dayId')
  updateWorkoutDay(
    @CurrentUser('id') trainerId: number,
    @Param('memberId') memberId: string,
    @Param('dayId') dayId: string,
    @Body() body: any,
  ) {
    return this.plansService.updateWorkoutDay(trainerId, +memberId, +dayId, body);
  }

  @Delete(':memberId/workout-plans/:planId/days/:dayId')
  deleteWorkoutDay(
    @CurrentUser('id') trainerId: number,
    @Param('memberId') memberId: string,
    @Param('dayId') dayId: string,
  ) {
    return this.plansService.deleteWorkoutDay(trainerId, +memberId, +dayId);
  }

  @Post(':memberId/workout-plans/:planId/days/:dayId/exercises')
  @HttpCode(201)
  addExercise(
    @CurrentUser('id') trainerId: number,
    @Param('memberId') memberId: string,
    @Param('dayId') dayId: string,
    @Body() body: any,
  ) {
    return this.plansService.addExercise(trainerId, +memberId, +dayId, body);
  }

  @Put(':memberId/workout-plans/:planId/days/:dayId/exercises/:exId')
  updateExercise(
    @CurrentUser('id') trainerId: number,
    @Param('memberId') memberId: string,
    @Param('exId') exId: string,
    @Body() body: any,
  ) {
    return this.plansService.updateExercise(trainerId, +memberId, +exId, body);
  }

  @Delete(':memberId/workout-plans/:planId/days/:dayId/exercises/:exId')
  deleteExercise(
    @CurrentUser('id') trainerId: number,
    @Param('memberId') memberId: string,
    @Param('exId') exId: string,
  ) {
    return this.plansService.deleteExercise(trainerId, +memberId, +exId);
  }

  // ─── Diet Plans ────────────────────────────────────────────────────────────
  @Get(':memberId/diet-plans')
  listDietPlans(@CurrentUser('id') trainerId: number, @Param('memberId') memberId: string) {
    return this.plansService.listDietPlans(trainerId, +memberId);
  }

  @Post(':memberId/diet-plans')
  @HttpCode(201)
  createDietPlan(
    @CurrentUser('id') trainerId: number,
    @ShopId() shopId: number,
    @Param('memberId') memberId: string,
    @Body() body: any,
  ) {
    return this.plansService.createDietPlan(trainerId, shopId, +memberId, body);
  }

  @Get(':memberId/diet-plans/:planId')
  getDietPlan(
    @CurrentUser('id') trainerId: number,
    @Param('memberId') memberId: string,
    @Param('planId') planId: string,
  ) {
    return this.plansService.getDietPlan(trainerId, +memberId, +planId);
  }

  @Put(':memberId/diet-plans/:planId')
  updateDietPlan(
    @CurrentUser('id') trainerId: number,
    @Param('memberId') memberId: string,
    @Param('planId') planId: string,
    @Body() body: any,
  ) {
    return this.plansService.updateDietPlan(trainerId, +memberId, +planId, body);
  }

  @Delete(':memberId/diet-plans/:planId')
  deleteDietPlan(
    @CurrentUser('id') trainerId: number,
    @Param('memberId') memberId: string,
    @Param('planId') planId: string,
  ) {
    return this.plansService.deleteDietPlan(trainerId, +memberId, +planId);
  }

  @Post(':memberId/diet-plans/:planId/meals')
  @HttpCode(201)
  addMeal(
    @CurrentUser('id') trainerId: number,
    @Param('memberId') memberId: string,
    @Param('planId') planId: string,
    @Body() body: any,
  ) {
    return this.plansService.addMeal(trainerId, +memberId, +planId, body);
  }

  @Put(':memberId/diet-plans/:planId/meals/:mealId')
  updateMeal(
    @CurrentUser('id') trainerId: number,
    @Param('memberId') memberId: string,
    @Param('mealId') mealId: string,
    @Body() body: any,
  ) {
    return this.plansService.updateMeal(trainerId, +memberId, +mealId, body);
  }

  @Delete(':memberId/diet-plans/:planId/meals/:mealId')
  deleteMeal(
    @CurrentUser('id') trainerId: number,
    @Param('memberId') memberId: string,
    @Param('mealId') mealId: string,
  ) {
    return this.plansService.deleteMeal(trainerId, +memberId, +mealId);
  }
}
