import { Controller, Get, Put, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsInboxService } from '../../shared/notifications-inbox.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, CurrentUser } from '../../common/decorators';

// Reuses the same generic, role-agnostic inbox as member & admin.
@Controller('trainer/notifications')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('trainer')
export class TrainerNotificationsController {
  constructor(private readonly inbox: NotificationsInboxService) {}

  @Get()
  list(@CurrentUser('id') userId: string, @Query() query: any) {
    return this.inbox.list(userId, query);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser('id') userId: string) {
    return this.inbox.unreadCount(userId);
  }

  @Put('read-all')
  markAllRead(@CurrentUser('id') userId: string) {
    return this.inbox.markAllRead(userId);
  }

  @Put(':id/read')
  markRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.inbox.markRead(userId, id);
  }
}
