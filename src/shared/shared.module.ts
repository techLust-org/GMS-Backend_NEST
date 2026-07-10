import { Global, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Attendance, Ledger, Notification, Subscription } from '../models';
import { RazorpayService } from './razorpay.service';
import { NotificationService } from './notification.service';
import { LedgerService } from './ledger.service';
import { FinancialService } from './financial.service';
import { CronService } from './cron.service';
import { NotificationsInboxService } from './notifications-inbox.service';

@Global()
@Module({
  imports: [SequelizeModule.forFeature([Notification, Ledger, Attendance, Subscription])],
  providers: [
    RazorpayService, NotificationService, LedgerService, FinancialService, CronService,
    NotificationsInboxService,
  ],
  exports: [
    RazorpayService, NotificationService, LedgerService, FinancialService,
    NotificationsInboxService,
  ],
})
export class SharedModule {}
