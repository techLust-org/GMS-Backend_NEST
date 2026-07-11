import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Attendance, User } from '../../models';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, ShopId } from '../../common/decorators';
import { ApiPayload } from '../../common/api-payload';

// Port of the inline handler in routes/admin/attendance.routes.js
@Controller('admin/attendance')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('admin')
export class AdminAttendanceController {
  constructor(@InjectModel(Attendance) private readonly attendance: typeof Attendance) {}

  @Get('today')
  async today(@ShopId() shopId: string, @Query() query: any) {
    const { page = 1, limit = 10 } = query;
    const today = new Date().toISOString().split('T')[0];
    const offset = (page - 1) * limit;
    const { count, rows } = await this.attendance.findAndCountAll({
      where: { attendance_date: today, shop_id: shopId },
      include: [{
        model: User,
        as: 'member',
        attributes: ['id', 'first_name', 'last_name', 'email'],
      }],
      order: [['check_in_time', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(String(offset), 10),
    });
    return new ApiPayload(rows, 'Attendance fetched', { total: count, page: +page, limit: +limit });
  }
}
