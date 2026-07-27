import { Controller, Get, Post, Param, Body, HttpCode, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PublicShopsService } from './shops.service';
import { CurrentUser } from '../common/decorators';
import { GoogleProfile } from '../auth/google-token.strategy';

// Public — no auth (except the Google-token-verifying routes, which don't
// require an existing session, just a valid Google ID token). Gym directory
// + member self-signup for the "Explore Gyms" screen reachable from login.
@Controller('shops')
export class PublicShopsController {
  constructor(private readonly shopsService: PublicShopsService) {}

  @Get()
  list() {
    return this.shopsService.listShops();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.shopsService.getShop(id);
  }

  @Post(':id/register-member')
  @HttpCode(201)
  registerMember(@Param('id') id: string, @Body() body: any) {
    return this.shopsService.registerMember(id, body);
  }

  // Body: { id_token, phone?, gender? }
  @Post(':id/register-member-google')
  @HttpCode(201)
  @UseGuards(AuthGuard('google-id-token'))
  registerMemberWithGoogle(
    @Param('id') id: string,
    @CurrentUser() profile: GoogleProfile,
    @Body() body: any,
  ) {
    return this.shopsService.registerMemberWithGoogle(id, profile, body);
  }

  // Body: { phone, code, firstName, lastName, email, gender? }
  @Post(':id/register-member-whatsapp')
  @HttpCode(201)
  registerMemberWithWhatsApp(@Param('id') id: string, @Body() body: any) {
    return this.shopsService.registerMemberWithWhatsApp(id, body);
  }

  // Body: { idToken, firstName, lastName, email, gender? }
  @Post(':id/register-member-phone')
  @HttpCode(201)
  registerMemberWithPhone(@Param('id') id: string, @Body() body: any) {
    return this.shopsService.registerMemberWithPhone(id, body);
  }
}
