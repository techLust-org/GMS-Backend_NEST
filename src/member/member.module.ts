import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import {
  Subscription, SubscriptionPlan, Payment, ExpenseCategory, Expense, User,
  Attendance, WorkoutPlan, DietPlan, Product, ProductSale,
} from '../models';
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
  imports: [
    SequelizeModule.forFeature([
      Subscription, SubscriptionPlan, Payment, ExpenseCategory, Expense, User,
      Attendance, WorkoutPlan, DietPlan, Product, ProductSale,
    ]),
  ],
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
