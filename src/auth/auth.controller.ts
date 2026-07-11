import { Controller, Post, Get, Put, Delete, Body, HttpCode, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, ResponseMessage } from '../common/decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ResponseMessage('Login successful')
  login(@Body() body: any) {
    return this.authService.login(body);
  }

  @Post('register-owner')
  @HttpCode(201)
  registerOwner(@Body() body: any) {
    return this.authService.registerOwner(body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser('id') userId: string) {
    return this.authService.me(userId);
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.authService.changePassword(userId, body);
  }

  @Post('profile-picture/presign')
  @UseGuards(JwtAuthGuard)
  presignProfilePicture(
    @CurrentUser('id') userId: string,
    @CurrentUser('shop_id') shopId: string | null,
    @CurrentUser('role') role: string,
    @Body() body: any,
  ) {
    return this.authService.presignProfilePicture(userId, shopId, role, body);
  }

  @Put('profile-picture')
  @UseGuards(JwtAuthGuard)
  updateProfilePicture(
    @CurrentUser('id') userId: string,
    @CurrentUser('shop_id') shopId: string | null,
    @CurrentUser('role') role: string,
    @Body() body: any,
  ) {
    return this.authService.updateProfilePicture(userId, shopId, role, body);
  }

  @Delete('profile-picture')
  @UseGuards(JwtAuthGuard)
  removeProfilePicture(@CurrentUser('id') userId: string) {
    return this.authService.removeProfilePicture(userId);
  }
}
