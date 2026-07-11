import { Controller, Get, Post, Put, Body, Param, Query, HttpCode, UseGuards } from '@nestjs/common';
import { AdminNotificationsService } from './notifications.service';
import { NotificationsInboxService } from '../../shared/notifications-inbox.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, ShopId, CurrentUser } from '../../common/decorators';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('admin')
export class AdminNotificationsController {
  constructor(
    private readonly notificationsService: AdminNotificationsService,
    private readonly inbox: NotificationsInboxService,
  ) {}

  @Post('broadcast')
  @HttpCode(200)
  broadcast(@ShopId() shopId: string, @Body() body: any) {
    return this.notificationsService.broadcast(shopId, body);
  }

  // The owner's own inbox — identical in shape to a member's.
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
