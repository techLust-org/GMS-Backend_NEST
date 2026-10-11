import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, Role } from '../../models';
import { NotificationService } from '../../shared/notification.service';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';

@Injectable()
export class AdminNotificationsService {
  constructor(
    @InjectModel(User.name) private readonly user: Model<any>,
    @InjectModel(Role.name) private readonly role: Model<any>,
    private readonly notificationService: NotificationService,
  ) {}

  async broadcast(shopId: string, body: any) {
    const { title, message } = body;
    if (!title || !message) throw new AppError('Title and message required', 400);

    const memberRole: any = await this.role.findOne({ name: 'member' });
    const members: any[] = await this.user
      .find({ role_id: memberRole.id, status: 'active', shop_id: shopId })
      .select('_id');

    const userIds = members.map((m) => m.id);
    await this.notificationService.bulkNotify(userIds, 'gym_announcement', title, message, null, shopId);

    return new ApiPayload({ sentTo: userIds.length }, 'Announcement sent');
  }
}
