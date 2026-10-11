import { Global, Module } from '@nestjs/common';
import { RazorpayService } from './razorpay.service';
import { NotificationService } from './notification.service';
import { LedgerService } from './ledger.service';
import { FinancialService } from './financial.service';
import { CronService } from './cron.service';
import { DbBackupCronService } from './db-backup.cron';
import { NotificationsInboxService } from './notifications-inbox.service';
import { S3Service } from './s3.service';
import { MailService } from './mail.service';
import { PushService } from './push.service';
import { WhatsAppService } from './whatsapp.service';
import { OtpService } from './otp.service';
import { FirebaseAdminService } from './firebase-admin.service';

@Global()
@Module({
  providers: [
    RazorpayService, NotificationService, LedgerService, FinancialService, CronService,
    DbBackupCronService, NotificationsInboxService, S3Service, MailService, PushService,
    WhatsAppService, OtpService, FirebaseAdminService,
  ],
  exports: [
    RazorpayService, NotificationService, LedgerService, FinancialService,
    DbBackupCronService, NotificationsInboxService, S3Service, MailService, PushService,
    WhatsAppService, OtpService, FirebaseAdminService,
  ],
})
export class SharedModule {}
