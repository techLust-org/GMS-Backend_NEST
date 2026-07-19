import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ActiveShopGuard } from '../common/guards/active-shop.guard';
import { Roles, CurrentUser, ShopId } from '../common/decorators';

// Self-service ID document upload for the currently signed-in member/trainer.
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, ActiveShopGuard)
@Roles('member', 'trainer')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('presign')
  presign(@CurrentUser('id') userId: string, @ShopId() shopId: string, @Body() body: any) {
    return this.documentsService.presign(userId, shopId, body);
  }

  @Post()
  @HttpCode(201)
  confirm(@CurrentUser('id') userId: string, @ShopId() shopId: string, @Body() body: any) {
    return this.documentsService.confirm(userId, shopId, body);
  }

  @Get('me')
  listMine(@CurrentUser('id') userId: string) {
    return this.documentsService.listMine(userId);
  }

  @Delete(':id')
  removeMine(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.documentsService.removeMine(userId, id);
  }
}
