import { Controller, Get, Post, Body, HttpCode, UseGuards } from '@nestjs/common';
import { MemberSubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ActiveShopGuard } from '../../common/guards/active-shop.guard';
import { Roles, ShopId, CurrentUser, ResponseMessage } from '../../common/decorators';

@Controller('member')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('member')
export class MemberSubscriptionController {
  constructor(private readonly subscriptionService: MemberSubscriptionService) {}

  @Get('subscription-plans')
  getPlans(@ShopId() shopId: string) {
    return this.subscriptionService.getPlans(shopId);
  }

  @Get('subscriptions')
  mySubscriptions(@ShopId() shopId: string, @CurrentUser('id') userId: string) {
    return this.subscriptionService.mySubscriptions(shopId, userId);
  }

  @Get('subscriptions/active')
  activeSubscription(@ShopId() shopId: string, @CurrentUser('id') userId: string) {
    return this.subscriptionService.activeSubscription(shopId, userId);
  }

  @Post('subscriptions/create-order')
  @HttpCode(200)
  createOrder(@ShopId() shopId: string, @CurrentUser('id') userId: string, @Body() body: any) {
    return this.subscriptionService.createOrder(shopId, userId, body);
  }

  @Post('subscriptions')
  @HttpCode(201)
  @ResponseMessage('Subscription activated')
  purchase(@ShopId() shopId: string, @CurrentUser('id') userId: string, @Body() body: any) {
    return this.subscriptionService.purchase(shopId, userId, body);
  }
}
