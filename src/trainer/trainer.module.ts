import { Module } from '@nestjs/common';
import { TrainerMembersService } from './members/members.service';
import { TrainerMembersController } from './members/members.controller';
import { TrainerPlansService } from './plans/plans.service';
import { TrainerPlansController } from './plans/plans.controller';
import { TrainerAbsenceService } from './absence/absence.service';
import { TrainerAbsenceController } from './absence/absence.controller';
import { TrainerNotificationsController } from './notifications/notifications.controller';

@Module({
  controllers: [
    TrainerMembersController,
    TrainerPlansController,
    TrainerAbsenceController,
    TrainerNotificationsController,
  ],
  providers: [TrainerMembersService, TrainerPlansService, TrainerAbsenceService],
})
export class TrainerModule {}
