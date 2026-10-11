import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from '../models';
import { AppError } from '../common/app-error';
import { ApiPayload } from '../common/api-payload';

// Port of controllers/member/notifications.controller.js — the generic,
// role-agnostic inbox reused by member, admin and trainer.
@Injectable()
export class NotificationsInboxService {
  constructor(@InjectModel(Notification.name) private readonly notification: Model<any>) {}

  async list(userId: string, query: any) {
    const { page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;
    const where = { user_id: userId };
    const [count, rows] = await Promise.all([
      this.notification.countDocuments(where),
      this.notification
        .find(where)
        .sort({ createdAt: -1 })
        .skip(parseInt(String(offset), 10))
        .limit(parseInt(limit)),
    ]);
    return new ApiPayload(rows, 'Notifications', { total: count, page: +page, limit: +limit });
  }

  async unreadCount(userId: string) {
    const count = await this.notification.countDocuments({ user_id: userId, is_read: false });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const n: any = await this.notification.findOne({ _id: id, user_id: userId });
    if (!n) throw new AppError('Notification not found', 404);
    await n.set({ is_read: true }).save();
    return new ApiPayload(null, 'Marked as read');
  }

  async markAllRead(userId: string) {
    await this.notification.updateMany({ user_id: userId, is_read: false }, { $set: { is_read: true } });
    return new ApiPayload(null, 'All marked as read');
  }
}
