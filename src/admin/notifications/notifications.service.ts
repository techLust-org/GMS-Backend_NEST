import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User, Role } from '../../models';
import { NotificationService } from '../../shared/notification.service';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';

@Injectable()
export class AdminNotificationsService {
  constructor(
    @InjectModel(User) private readonly user: typeof User,
    @InjectModel(Role) private readonly role: typeof Role,
    private readonly notificationService: NotificationService,
  ) {}

  async broadcast(shopId: number, body: any) {
    const { title, message } = body;
    if (!title || !message) throw new AppError('Title and message required', 400);

    const memberRole: any = await this.role.findOne({ where: { name: 'member' } });
    const members: any[] = await this.user.findAll({
      where: { role_id: memberRole.id, status: 'active', shop_id: shopId },
      attributes: ['id'],
    });

    const userIds = members.map((m) => m.id);
    await this.notificationService.bulkNotify(userIds, 'gym_announcement', title, message, null, shopId);

    return new ApiPayload({ sentTo: userIds.length }, 'Announcement sent');
  }
}
