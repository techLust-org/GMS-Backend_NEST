import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance, Subscription, toDateOnly } from '../models';
import { NotificationService } from './notification.service';

// Port of utils/cronJobs.js
@Injectable()
export class CronService implements OnModuleInit {
  private readonly logger = new Logger('Cron');

  constructor(
    @InjectModel(Attendance.name) private readonly attendance: Model<any>,
    @InjectModel(Subscription.name) private readonly subscription: Model<any>,
    private readonly notificationService: NotificationService,
  ) {}

  onModuleInit() {
    this.logger.log('Cron jobs started');
  }

  // Midnight: auto-close open check-ins + check expiring subscriptions
  @Cron('1 0 * * *')
  async dailyMaintenance() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yDate = yesterday.toISOString().split('T')[0];

      // Auto-close check-ins from yesterday: anyone who forgot to check out
      // gets checked out at midnight (end of the day they checked in on).
      const openSessions = await this.attendance.find({ check_out_time: null, attendance_date: yDate });
      const autoCheckout = new Date(`${yDate}T23:59:59`);
      for (const session of openSessions) {
        await session.set({ check_out_time: autoCheckout }).save();
      }

      // Update expired subscriptions. Postgres compared the DATE end_date
      // against the current timestamp, so a subscription ending today counted
      // as already past (today 00:00 < now) — hence <= today here.
      await this.subscription.updateMany(
        { status: 'active', end_date: { $lte: toDateOnly(new Date()) } },
        { $set: { status: 'expired' } },
      );

      // Notify members with subscriptions expiring in 7, 3, 1 days
      const today = new Date();
      for (const daysAhead of [7, 3, 1]) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysAhead);
        const dateStr = targetDate.toISOString().split('T')[0];

        const expiring = await this.subscription.find({ status: 'active', end_date: dateStr });

        for (const sub of expiring) {
          await this.notificationService.createNotification({
            userId: sub.member_id,
            type: 'subscription_expiry',
            title: 'Subscription Expiring Soon',
            message: `Your gym subscription expires in ${daysAhead} day${daysAhead > 1 ? 's' : ''}. Please renew to continue access.`,
            relatedId: sub.id,
          });
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Cron job error:', err);
    }
  }
}
