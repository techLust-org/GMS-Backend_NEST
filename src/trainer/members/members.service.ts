import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TrainerMember, User, Role, Attendance } from '../../models';
import { NotificationService } from '../../shared/notification.service';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';
import { iLike } from '../../database/db-utils';

@Injectable()
export class TrainerMembersService {
  constructor(
    @InjectModel(TrainerMember.name) private readonly trainerMember: Model<any>,
    @InjectModel(User.name) private readonly user: Model<any>,
    @InjectModel(Role.name) private readonly role: Model<any>,
    @InjectModel(Attendance.name) private readonly attendance: Model<any>,
    private readonly notificationService: NotificationService,
  ) {}

  async myMembers(shopId: string, trainerId: string, query: any = {}) {
    const { page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;
    const where = { shop_id: shopId, trainer_id: trainerId, is_active: true };
    const [count, rows] = await Promise.all([
      this.trainerMember.countDocuments(where),
      this.trainerMember
        .find(where)
        .populate({ path: 'member', populate: { path: 'Role', select: 'name -_id' } })
        .skip(parseInt(String(offset), 10))
        .limit(parseInt(limit)),
    ]);
    const members = rows.map((a: any) => a.member);
    return new ApiPayload(members, 'Members fetched', { total: count, page: +page, limit: +limit });
  }

  async assign(shopId: string, trainerId: string, memberId: string) {
    const member = await this.user.findOne({ _id: memberId, shop_id: shopId });
    if (!member) throw new AppError('Member not found', 404);

    const existing = await this.trainerMember.findOne({ shop_id: shopId, member_id: memberId, is_active: true });
    if (existing) throw new AppError('Member already has an active trainer', 409);

    const assignment = await this.trainerMember.create({
      shop_id: shopId,
      trainer_id: trainerId,
      member_id: memberId,
      is_active: true,
    });

    const trainer: any = await this.user.findById(trainerId);
    await this.notificationService.createNotification({
      userId: memberId,
      shopId,
      type: 'trainer_assigned',
      title: 'Trainer Assigned',
      message: `${trainer.first_name} ${trainer.last_name} has been assigned as your trainer.`,
      relatedId: trainerId,
    });

    return new ApiPayload(assignment, 'Member assigned');
  }

  async unassign(shopId: string, trainerId: string, memberId: string) {
    const assignment: any = await this.trainerMember.findOne({
      shop_id: shopId, trainer_id: trainerId, member_id: memberId, is_active: true,
    });
    if (!assignment) throw new AppError('Assignment not found', 404);

    await assignment.set({ is_active: false }).save();

    const trainer: any = await this.user.findById(trainerId);
    await this.notificationService.createNotification({
      userId: memberId,
      shopId,
      type: 'trainer_unassigned',
      title: 'Trainer Unassigned',
      message: `${trainer.first_name} ${trainer.last_name} has unassigned from you.`,
      relatedId: trainerId,
    });

    return new ApiPayload(null, 'Member unassigned');
  }

  async memberAttendance(shopId: string, trainerId: string, memberId: string, query: any) {
    const assignment = await this.trainerMember.findOne({
      shop_id: shopId, trainer_id: trainerId, member_id: memberId, is_active: true,
    });
    if (!assignment) throw new AppError('Not your assigned member', 403);

    const { from, to } = query;
    const where: any = { shop_id: shopId, member_id: memberId };
    if (from || to) {
      where.attendance_date = {};
      if (from) where.attendance_date.$gte = from;
      if (to) where.attendance_date.$lte = to;
    }

    return this.attendance.find(where).sort({ attendance_date: -1 });
  }

  async availableMembers(shopId: string, query: any) {
    const { search, page = 1, limit = 10 } = query;
    const memberRole: any = await this.role.findOne({ name: 'member' });

    const assignedMemberIds = (await this.trainerMember
      .find({ shop_id: shopId, is_active: true })
      .select('member_id')).map((a: any) => a.member_id);

    const where: any = { role_id: memberRole.id, status: 'active', shop_id: shopId };
    if (assignedMemberIds.length) where._id = { $nin: assignedMemberIds };
    if (search) {
      where.$or = [
        { first_name: iLike(search) },
        { last_name: iLike(search) },
        { email: iLike(search) },
      ];
    }

    const offset = (page - 1) * limit;
    const [count, rows] = await Promise.all([
      this.user.countDocuments(where),
      this.user
        .find(where)
        .skip(parseInt(String(offset), 10))
        .limit(parseInt(limit)),
    ]);
    return new ApiPayload(rows, 'Available members fetched', { total: count, page: +page, limit: +limit });
  }
}
