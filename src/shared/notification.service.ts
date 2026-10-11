import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, User } from '../models';
import { PushService } from './push.service';

interface CreateNotificationArgs {
  userId: string;
  shopId?: string | null;
  type: string;
  title: string;
  message: string;
  relatedId?: string | null;
}

// Port of services/notification.service.js
const MAX_NOTIFICATIONS_PER_USER = 12;

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name) private readonly notification: Model<any>,
    @InjectModel(User.name) private readonly user: Model<any>,
    private readonly push: PushService,
  ) {}

  // Best-effort FCM push alongside the in-app notification row — never lets
  // a push failure affect the caller's request.
  private async pushToUser(userId: string, title: string, message: string, type: string) {
    const record: any = await this.user.findById(userId).select('fcm_token');
    const token = record?.fcm_token;
    if (!token) return;
    const { shouldClearToken } = await this.push.sendToToken(token, title, message, { type });
    if (shouldClearToken) {
      await this.user.updateOne({ _id: userId }, { $set: { fcm_token: null } }).catch(() => {});
    }
  }

  // Keeps only the most recent MAX_NOTIFICATIONS_PER_USER rows for a user,
  // deleting anything older once that cap is exceeded.
  private async pruneOldNotifications(userId: string) {
    const recent = await this.notification
      .find({ user_id: userId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(MAX_NOTIFICATIONS_PER_USER)
      .select('_id');
    const keepIds = recent.map((n: any) => n.id);
    if (!keepIds.length) return;
    await this.notification.deleteMany({ user_id: userId, _id: { $nin: keepIds } });
  }

  async createNotification({
    userId,
    shopId = null,
    type,
    title,
    message,
    relatedId = null,
  }: CreateNotificationArgs) {
    const created = await this.notification.create({
      user_id: userId,
      shop_id: shopId,
      type,
      title,
      message,
      related_id: relatedId,
    });
    await this.pruneOldNotifications(userId);
    this.pushToUser(userId, title, message, type).catch(() => {});
    return created;
  }

  async bulkNotify(
    userIds: string[],
    type: string,
    title: string,
    message: string,
    relatedId: string | null = null,
    shopId: string | null = null,
  ) {
    if (!userIds.length) return;
    const records = userIds.map((userId) => ({
      user_id: userId,
      shop_id: shopId,
      type,
      title,
      message,
      related_id: relatedId,
      is_read: false,
    }));
    const created = await this.notification.insertMany(records);
    await Promise.all(userIds.map((userId) => this.pruneOldNotifications(userId)));
    Promise.all(userIds.map((userId) => this.pushToUser(userId, title, message, type))).catch(() => {});
    return created;
  }
}
