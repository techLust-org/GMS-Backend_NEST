import { Controller, Post, Get, Put, Body, HttpCode, UseGuards } from '@nestjs/common';
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
  me(@CurrentUser('id') userId: number) {
    return this.authService.me(userId);
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser('id') userId: number, @Body() body: any) {
    return this.authService.changePassword(userId, body);
  }
}
