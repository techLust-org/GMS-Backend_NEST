import { Controller, Post, Get, Put, Delete, Body, HttpCode, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, ResponseMessage } from '../common/decorators';
import { GoogleProfile } from './google-token.strategy';

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

  // Body: { id_token: '<Google ID token from google_sign_in>' }
  @Post('google')
  @HttpCode(200)
  @ResponseMessage('Login successful')
  @UseGuards(AuthGuard('google-id-token'))
  loginWithGoogle(@CurrentUser() profile: GoogleProfile) {
    return this.authService.loginWithGoogle(profile);
  }

  // Body: { id_token, shopName, shopPhone?, shopEmail? }
  @Post('register-owner-google')
  @HttpCode(201)
  @UseGuards(AuthGuard('google-id-token'))
  registerOwnerWithGoogle(@CurrentUser() profile: GoogleProfile, @Body() body: any) {
    return this.authService.registerOwnerWithGoogle(profile, body);
  }

  // Body: { phone }
  @Post('whatsapp-otp/send')
  @HttpCode(200)
  sendWhatsAppOtp(@Body() body: any) {
    return this.authService.sendWhatsAppOtp(body);
  }

  // Body: { phone, code }
  @Post('whatsapp-otp/login')
  @HttpCode(200)
  @ResponseMessage('Login successful')
  loginWithWhatsApp(@Body() body: any) {
    return this.authService.loginWithWhatsApp(body);
  }

  // Body: { phone, code, shopName, shopPhone?, shopEmail? }
  @Post('register-owner-whatsapp')
  @HttpCode(201)
  registerOwnerWithWhatsApp(@Body() body: any) {
    return this.authService.registerOwnerWithWhatsApp(body);
  }

  // Body: { email, password } — public, no JWT required; the password IS
  // the authentication (same as login), so this works as a standalone
  // account-deletion flow.
  @Post('delete-account')
  @HttpCode(200)
  deleteAccount(@Body() body: any) {
    return this.authService.deleteAccount(body);
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

  @Put('fcm-token')
  @UseGuards(JwtAuthGuard)
  updateFcmToken(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.authService.updateFcmToken(userId, body);
  }

  @Delete('fcm-token')
  @UseGuards(JwtAuthGuard)
  clearFcmToken(@CurrentUser('id') userId: string) {
    return this.authService.updateFcmToken(userId, { fcmToken: null });
  }
}
