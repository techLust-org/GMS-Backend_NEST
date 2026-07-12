import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Attendance, Subscription, Shop } from '../../models';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';

@Injectable()
export class MemberAttendanceService {
  constructor(
    @InjectModel(Attendance) private readonly attendance: typeof Attendance,
    @InjectModel(Subscription) private readonly subscription: typeof Subscription,
    @InjectModel(Shop) private readonly shop: typeof Shop,
  ) {}

  async history(shopId: string, userId: string, query: any) {
    const { from, to } = query;
    const where: any = { shop_id: shopId, member_id: userId };
    if (from || to) {
      where.attendance_date = {};
      if (from) where.attendance_date[Op.gte] = from;
      if (to) where.attendance_date[Op.lte] = to;
    }
    return this.attendance.findAll({ where, order: [['attendance_date', 'DESC']] });
  }

  async today(shopId: string, userId: string) {
    const today = new Date().toISOString().split('T')[0];
    return this.attendance.findOne({
      where: { shop_id: shopId, member_id: userId, attendance_date: today },
    });
  }

  async checkIn(shopId: string, userId: string) {
    const shop: any = await this.shop.findByPk(shopId, { attributes: ['is_closed'] });
    if (shop?.is_closed) throw new AppError('The gym is closed today. Check-in is unavailable.', 403);

    const activeSub = await this.subscription.findOne({
      where: { shop_id: shopId, member_id: userId, status: 'active' },
    });
    if (!activeSub) throw new AppError('No active subscription. Please purchase a plan to check in.', 403);

    const today = new Date().toISOString().split('T')[0];
    const existing = await this.attendance.findOne({
      where: { shop_id: shopId, member_id: userId, attendance_date: today },
    });
    if (existing) throw new AppError('Already checked in today', 409);

    const record = await this.attendance.create({
      shop_id: shopId,
      member_id: userId,
      attendance_date: today,
      check_in_time: new Date(),
    } as any);
    return new ApiPayload(record, 'Checked in successfully');
  }

  async checkOut(shopId: string, userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const record: any = await this.attendance.findOne({
      where: { shop_id: shopId, member_id: userId, attendance_date: today },
    });
    if (!record) throw new AppError('No check-in found for today', 404);
    if (record.check_out_time) throw new AppError('Already checked out', 409);

    await record.update({ check_out_time: new Date() });
    return new ApiPayload(record, 'Checked out successfully');
  }
}
