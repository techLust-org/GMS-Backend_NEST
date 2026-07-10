import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import {
  TrainerMember, User, Role, Attendance, WorkoutPlan, WorkoutDay, WorkoutExercise,
  DietPlan, DietMeal, TrainerAbsence,
} from '../models';
import { TrainerMembersService } from './members/members.service';
import { TrainerMembersController } from './members/members.controller';
import { TrainerPlansService } from './plans/plans.service';
import { TrainerPlansController } from './plans/plans.controller';
import { TrainerAbsenceService } from './absence/absence.service';
import { TrainerAbsenceController } from './absence/absence.controller';
import { TrainerNotificationsController } from './notifications/notifications.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([
      TrainerMember, User, Role, Attendance, WorkoutPlan, WorkoutDay, WorkoutExercise,
      DietPlan, DietMeal, TrainerAbsence,
    ]),
  ],
  controllers: [
    TrainerMembersController,
    TrainerPlansController,
    TrainerAbsenceController,
    TrainerNotificationsController,
  ],
  providers: [TrainerMembersService, TrainerPlansService, TrainerAbsenceService],
})
export class TrainerModule {}
