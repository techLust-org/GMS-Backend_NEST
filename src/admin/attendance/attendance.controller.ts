import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance } from '../../models';
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
  constructor(@InjectModel(Attendance.name) private readonly attendance: Model<any>) {}

  @Get('today')
  async today(@ShopId() shopId: string, @Query() query: any) {
    const { page = 1, limit = 10 } = query;
    const today = new Date().toISOString().split('T')[0];
    const offset = (page - 1) * limit;
    const where = { attendance_date: today, shop_id: shopId };
    const [count, rows] = await Promise.all([
      this.attendance.countDocuments(where),
      this.attendance
        .find(where)
        .populate({ path: 'member', select: 'first_name last_name email' })
        .sort({ check_in_time: 1 })
        .skip(parseInt(String(offset), 10))
        .limit(parseInt(limit)),
    ]);
    return new ApiPayload(rows, 'Attendance fetched', { total: count, page: +page, limit: +limit });
  }
}
