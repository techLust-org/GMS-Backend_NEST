import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import {
  User, Role, Subscription, SubscriptionPlan, Expense, ExpenseCategory,
  Product, ProductSale, Payment, Shop, Attendance,
} from '../models';
import { UsersService } from './users/users.service';
import { UsersController } from './users/users.controller';
import { AdminFinancialService } from './financial/financial.service';
import { AdminFinancialController } from './financial/financial.controller';
import { ProductsService } from './products/products.service';
import { ProductsController } from './products/products.controller';
import { OrdersService } from './orders/orders.service';
import { OrdersController } from './orders/orders.controller';
import { AdminShopService } from './shop/shop.service';
import { AdminShopController } from './shop/shop.controller';
import { MemberPlansService } from './member-plans/member-plans.service';
import { MemberPlansController } from './member-plans/member-plans.controller';
import { ExpenseCategoriesService } from './expense-categories/expense-categories.service';
import { ExpenseCategoriesController } from './expense-categories/expense-categories.controller';
import { AdminNotificationsService } from './notifications/notifications.service';
import { AdminNotificationsController } from './notifications/notifications.controller';
import { AdminAttendanceController } from './attendance/attendance.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([
      User, Role, Subscription, SubscriptionPlan, Expense, ExpenseCategory,
      Product, ProductSale, Payment, Shop, Attendance,
    ]),
  ],
  controllers: [
    UsersController,
    AdminFinancialController,
    ProductsController,
    OrdersController,
    AdminShopController,
    MemberPlansController,
    ExpenseCategoriesController,
    AdminNotificationsController,
    AdminAttendanceController,
  ],
  providers: [
    UsersService,
    AdminFinancialService,
    ProductsService,
    OrdersService,
    AdminShopService,
    MemberPlansService,
    ExpenseCategoriesService,
    AdminNotificationsService,
  ],
})
export class AdminModule {}
