import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Attendance, User } from '../../models';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, ShopId } from '../../common/decorators';

// Port of the inline handler in routes/admin/attendance.routes.js
@Controller('admin/attendance')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('admin')
export class AdminAttendanceController {
  constructor(@InjectModel(Attendance) private readonly attendance: typeof Attendance) {}

  @Get('today')
  today(@ShopId() shopId: number) {
    const today = new Date().toISOString().split('T')[0];
    return this.attendance.findAll({
      where: { attendance_date: today, shop_id: shopId },
      include: [{
        model: User,
        as: 'member',
        attributes: ['id', 'first_name', 'last_name', 'email'],
      }],
      order: [['check_in_time', 'ASC']],
    });
  }
}
