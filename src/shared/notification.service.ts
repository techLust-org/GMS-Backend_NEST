import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Notification } from '../models';

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
  constructor(@InjectModel(Notification) private readonly notification: typeof Notification) {}

  // Keeps only the most recent MAX_NOTIFICATIONS_PER_USER rows for a user,
  // deleting anything older once that cap is exceeded.
  private async pruneOldNotifications(userId: string) {
    const recent = await this.notification.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC'], ['id', 'DESC']],
      limit: MAX_NOTIFICATIONS_PER_USER,
      attributes: ['id'],
    });
    const keepIds = recent.map((n: any) => n.id);
    if (!keepIds.length) return;
    await this.notification.destroy({
      where: { user_id: userId, id: { [Op.notIn]: keepIds } },
    });
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
    } as any);
    await this.pruneOldNotifications(userId);
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
      created_at: new Date(),
      updated_at: new Date(),
    }));
    const created = await this.notification.bulkCreate(records as any);
    await Promise.all(userIds.map((userId) => this.pruneOldNotifications(userId)));
    return created;
  }
}
