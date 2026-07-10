import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Notification } from '../models';
import { AppError } from '../common/app-error';
import { ApiPayload } from '../common/api-payload';

// Port of controllers/member/notifications.controller.js — the generic,
// role-agnostic inbox reused by member, admin and trainer.
@Injectable()
export class NotificationsInboxService {
  constructor(@InjectModel(Notification) private readonly notification: typeof Notification) {}

  async list(userId: number, query: any) {
    const { page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;
    const { count, rows } = await this.notification.findAndCountAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(String(offset), 10),
    });
    return new ApiPayload(rows, 'Notifications', { total: count, page: +page, limit: +limit });
  }

  async unreadCount(userId: number) {
    const count = await this.notification.count({
      where: { user_id: userId, is_read: false },
    });
    return { count };
  }

  async markRead(userId: number, id: number) {
    const n: any = await this.notification.findOne({ where: { id, user_id: userId } });
    if (!n) throw new AppError('Notification not found', 404);
    await n.update({ is_read: true });
    return new ApiPayload(null, 'Marked as read');
  }

  async markAllRead(userId: number) {
    await this.notification.update({ is_read: true }, { where: { user_id: userId, is_read: false } });
    return new ApiPayload(null, 'All marked as read');
  }
}
