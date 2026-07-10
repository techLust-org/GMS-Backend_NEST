import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Notification } from '../models';

interface CreateNotificationArgs {
  userId: number;
  shopId?: number | null;
  type: string;
  title: string;
  message: string;
  relatedId?: number | null;
}

// Port of services/notification.service.js
@Injectable()
export class NotificationService {
  constructor(@InjectModel(Notification) private readonly notification: typeof Notification) {}

  async createNotification({
    userId,
    shopId = null,
    type,
    title,
    message,
    relatedId = null,
  }: CreateNotificationArgs) {
    return this.notification.create({
      user_id: userId,
      shop_id: shopId,
      type,
      title,
      message,
      related_id: relatedId,
    } as any);
  }

  async bulkNotify(
    userIds: number[],
    type: string,
    title: string,
    message: string,
    relatedId: number | null = null,
    shopId: number | null = null,
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
      created_at: new Date(),
      updated_at: new Date(),
    }));
    return this.notification.bulkCreate(records as any);
  }
}
