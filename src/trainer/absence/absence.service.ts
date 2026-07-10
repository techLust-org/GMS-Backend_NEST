import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TrainerAbsence, TrainerMember, User } from '../../models';
import { NotificationService } from '../../shared/notification.service';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';

@Injectable()
export class TrainerAbsenceService {
  constructor(
    @InjectModel(TrainerAbsence) private readonly trainerAbsence: typeof TrainerAbsence,
    @InjectModel(TrainerMember) private readonly trainerMember: typeof TrainerMember,
    @InjectModel(User) private readonly user: typeof User,
    private readonly notificationService: NotificationService,
  ) {}

  async list(shopId: number, trainerId: number) {
    return this.trainerAbsence.findAll({
      where: { shop_id: shopId, trainer_id: trainerId },
      order: [['absence_date', 'ASC']],
    });
  }

  async create(shopId: number, trainerId: number, body: any) {
    const { absence_date, reason } = body;
    if (!absence_date) throw new AppError('Date required', 400);

    const existing = await this.trainerAbsence.findOne({
      where: { shop_id: shopId, trainer_id: trainerId, absence_date },
    });
    if (existing) throw new AppError('Absence already marked for this date', 409);

    const absence: any = await this.trainerAbsence.create({
      shop_id: shopId,
      trainer_id: trainerId,
      absence_date,
      reason,
    } as any);

    const assignments: any[] = await this.trainerMember.findAll({
      where: { shop_id: shopId, trainer_id: trainerId, is_active: true },
      attributes: ['member_id'],
    });
    const memberIds = assignments.map((a) => a.member_id);

    if (memberIds.length) {
      const trainer: any = await this.user.findByPk(trainerId);
      await this.notificationService.bulkNotify(
        memberIds,
        'trainer_absence',
        'Trainer Absence Notice',
        `Your trainer ${trainer.first_name} ${trainer.last_name} will be absent on ${absence_date}. ${reason ? `Reason: ${reason}` : ''}`,
        trainerId,
        shopId,
      );
    }

    await absence.update({ notified: true });
    return new ApiPayload(absence, 'Absence marked');
  }

  async remove(shopId: number, trainerId: number, id: number) {
    const absence: any = await this.trainerAbsence.findOne({
      where: { id, shop_id: shopId, trainer_id: trainerId },
    });
    if (!absence) throw new AppError('Absence not found', 404);
    await absence.destroy();
    return new ApiPayload(null, 'Absence removed');
  }
}
