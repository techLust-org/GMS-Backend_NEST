import { Global, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Attendance, Ledger, Notification, Subscription } from '../models';
import { RazorpayService } from './razorpay.service';
import { NotificationService } from './notification.service';
import { LedgerService } from './ledger.service';
import { FinancialService } from './financial.service';
import { CronService } from './cron.service';
import { NotificationsInboxService } from './notifications-inbox.service';
import { S3Service } from './s3.service';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [SequelizeModule.forFeature([Notification, Ledger, Attendance, Subscription])],
  providers: [
    RazorpayService, NotificationService, LedgerService, FinancialService, CronService,
    NotificationsInboxService, S3Service, MailService,
  ],
  exports: [
    RazorpayService, NotificationService, LedgerService, FinancialService,
    NotificationsInboxService, S3Service, MailService,
  ],
})
export class SharedModule {}
