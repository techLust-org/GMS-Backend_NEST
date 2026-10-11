import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TrainerAbsence, TrainerMember, User } from '../../models';
import { NotificationService } from '../../shared/notification.service';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';

@Injectable()
export class TrainerAbsenceService {
  constructor(
    @InjectModel(TrainerAbsence.name) private readonly trainerAbsence: Model<any>,
    @InjectModel(TrainerMember.name) private readonly trainerMember: Model<any>,
    @InjectModel(User.name) private readonly user: Model<any>,
    private readonly notificationService: NotificationService,
  ) {}

  async list(shopId: string, trainerId: string, query: any = {}) {
    const { page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;
    const where = { shop_id: shopId, trainer_id: trainerId };
    const [count, rows] = await Promise.all([
      this.trainerAbsence.countDocuments(where),
      this.trainerAbsence
        .find(where)
        .sort({ absence_date: 1 })
        .skip(parseInt(String(offset), 10))
        .limit(parseInt(limit)),
    ]);
    return new ApiPayload(rows, 'Absences fetched', { total: count, page: +page, limit: +limit });
  }

  async create(shopId: string, trainerId: string, body: any) {
    const { absence_date, reason } = body;
    if (!absence_date) throw new AppError('Date required', 400);

    const existing = await this.trainerAbsence.findOne({ shop_id: shopId, trainer_id: trainerId, absence_date });
    if (existing) throw new AppError('Absence already marked for this date', 409);

    const absence: any = await this.trainerAbsence.create({
      shop_id: shopId,
      trainer_id: trainerId,
      absence_date,
      reason,
    });

    const assignments: any[] = await this.trainerMember
      .find({ shop_id: shopId, trainer_id: trainerId, is_active: true })
      .select('member_id');
    const memberIds = assignments.map((a) => a.member_id);

    if (memberIds.length) {
      const trainer: any = await this.user.findById(trainerId);
      await this.notificationService.bulkNotify(
        memberIds,
        'trainer_absence',
        'Trainer Absence Notice',
        `Your trainer ${trainer.first_name} ${trainer.last_name} will be absent on ${absence_date}. ${reason ? `Reason: ${reason}` : ''}`,
        trainerId,
        shopId,
      );
    }

    await absence.set({ notified: true }).save();
    return new ApiPayload(absence, 'Absence marked');
  }

  async remove(shopId: string, trainerId: string, id: string) {
    const absence: any = await this.trainerAbsence.findOne({ _id: id, shop_id: shopId, trainer_id: trainerId });
    if (!absence) throw new AppError('Absence not found', 404);
    await absence.deleteOne();
    return new ApiPayload(null, 'Absence removed');
  }
}
