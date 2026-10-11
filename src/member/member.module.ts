import { Module } from '@nestjs/common';
import { MemberSubscriptionService } from './subscription/subscription.service';
import { MemberSubscriptionController } from './subscription/subscription.controller';
import { MemberAttendanceService } from './attendance/attendance.service';
import { MemberAttendanceController } from './attendance/attendance.controller';
import { MemberPlansService } from './plans/plans.service';
import { MemberPlansController } from './plans/plans.controller';
import { MemberShopService } from './shop/shop.service';
import { MemberShopController } from './shop/shop.controller';
import { MemberNotificationsController } from './notifications/notifications.controller';

@Module({
  controllers: [
    MemberSubscriptionController,
    MemberAttendanceController,
    MemberPlansController,
    MemberShopController,
    MemberNotificationsController,
  ],
  providers: [
    MemberSubscriptionService,
    MemberAttendanceService,
    MemberPlansService,
    MemberShopService,
  ],
})
export class MemberModule {}
