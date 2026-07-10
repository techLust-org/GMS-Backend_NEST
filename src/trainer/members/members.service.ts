import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { TrainerMember, User, Role, Attendance } from '../../models';
import { NotificationService } from '../../shared/notification.service';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';

@Injectable()
export class TrainerMembersService {
  constructor(
    @InjectModel(TrainerMember) private readonly trainerMember: typeof TrainerMember,
    @InjectModel(User) private readonly user: typeof User,
    @InjectModel(Role) private readonly role: typeof Role,
    @InjectModel(Attendance) private readonly attendance: typeof Attendance,
    private readonly notificationService: NotificationService,
  ) {}

  async myMembers(shopId: number, trainerId: number) {
    const assignments: any[] = await this.trainerMember.findAll({
      where: { shop_id: shopId, trainer_id: trainerId, is_active: true },
      include: [{
        model: User, as: 'member',
        include: [{ model: Role, attributes: ['name'] }],
      }],
    });
    return assignments.map((a) => a.member);
  }

  async assign(shopId: number, trainerId: number, memberId: number) {
    const member = await this.user.findOne({ where: { id: memberId, shop_id: shopId } });
    if (!member) throw new AppError('Member not found', 404);

    const existing = await this.trainerMember.findOne({
      where: { shop_id: shopId, member_id: memberId, is_active: true },
    });
    if (existing) throw new AppError('Member already has an active trainer', 409);

    const assignment = await this.trainerMember.create({
      shop_id: shopId,
      trainer_id: trainerId,
      member_id: memberId,
      is_active: true,
    } as any);

    const trainer: any = await this.user.findByPk(trainerId);
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

  async unassign(shopId: number, trainerId: number, memberId: number) {
    const assignment: any = await this.trainerMember.findOne({
      where: { shop_id: shopId, trainer_id: trainerId, member_id: memberId, is_active: true },
    });
    if (!assignment) throw new AppError('Assignment not found', 404);

    await assignment.update({ is_active: false });

    const trainer: any = await this.user.findByPk(trainerId);
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

  async memberAttendance(shopId: number, trainerId: number, memberId: number, query: any) {
    const assignment = await this.trainerMember.findOne({
      where: { shop_id: shopId, trainer_id: trainerId, member_id: memberId, is_active: true },
    });
    if (!assignment) throw new AppError('Not your assigned member', 403);

    const { from, to } = query;
    const where: any = { shop_id: shopId, member_id: memberId };
    if (from || to) {
      where.attendance_date = {};
      if (from) where.attendance_date[Op.gte] = from;
      if (to) where.attendance_date[Op.lte] = to;
    }

    return this.attendance.findAll({ where, order: [['attendance_date', 'DESC']] });
  }

  async availableMembers(shopId: number, query: any) {
    const { search } = query;
    const memberRole: any = await this.role.findOne({ where: { name: 'member' } });

    const assignedMemberIds = (await this.trainerMember.findAll({
      where: { shop_id: shopId, is_active: true },
      attributes: ['member_id'],
    })).map((a: any) => a.member_id);

    const where: any = { role_id: memberRole.id, status: 'active', shop_id: shopId };
    if (assignedMemberIds.length) where.id = { [Op.notIn]: assignedMemberIds };
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    return this.user.findAll({ where });
  }
}
