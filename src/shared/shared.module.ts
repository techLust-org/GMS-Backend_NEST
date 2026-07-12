import { Global, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Attendance, Ledger, Notification, Subscription, User, OtpRequest } from '../models';
import { RazorpayService } from './razorpay.service';
import { NotificationService } from './notification.service';
import { LedgerService } from './ledger.service';
import { FinancialService } from './financial.service';
import { CronService } from './cron.service';
import { NotificationsInboxService } from './notifications-inbox.service';
import { S3Service } from './s3.service';
import { MailService } from './mail.service';
import { PushService } from './push.service';
import { WhatsAppService } from './whatsapp.service';
import { OtpService } from './otp.service';

@Global()
@Module({
  imports: [SequelizeModule.forFeature([Notification, Ledger, Attendance, Subscription, User, OtpRequest])],
  providers: [
    RazorpayService, NotificationService, LedgerService, FinancialService, CronService,
    NotificationsInboxService, S3Service, MailService, PushService, WhatsAppService, OtpService,
  ],
  exports: [
    RazorpayService, NotificationService, LedgerService, FinancialService,
    NotificationsInboxService, S3Service, MailService, PushService, WhatsAppService, OtpService,
  ],
})
export class SharedModule {}
