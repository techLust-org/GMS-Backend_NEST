import { Controller, Get, Put, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ActiveShopGuard } from '../common/guards/active-shop.guard';
import { Roles, CurrentUser, ShopId } from '../common/decorators';

function clientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim();
  return req.ip ?? null;
}

// Gym-owner review queue. The list endpoint only ever resolves masked
// previews (see DocumentsService.listForShop); the original file is only
// reachable one-at-a-time via viewOriginal, which is audit-logged.
@Controller('admin/documents')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('admin')
export class AdminDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  list(@ShopId() shopId: string, @Query() query: any) {
    return this.documentsService.listForShop(shopId, query);
  }

  @Get(':id/view-original')
  viewOriginal(
    @CurrentUser('id') adminId: string,
    @ShopId() shopId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.documentsService.viewOriginal(adminId, shopId, id, clientIp(req));
  }

  @Put(':id/verify')
  verify(@CurrentUser('id') adminId: string, @ShopId() shopId: string, @Param('id') id: string) {
    return this.documentsService.review(adminId, shopId, id, 'verified');
  }

  @Put(':id/reject')
  reject(
    @CurrentUser('id') adminId: string,
    @ShopId() shopId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.documentsService.review(adminId, shopId, id, 'rejected', body?.reason);
  }
}
