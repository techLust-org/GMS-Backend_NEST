import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { Shop, SubscriptionPlan, Role, User } from '../models';
import { AuthCryptoService } from '../common/auth-crypto.service';
import { S3Service } from '../shared/s3.service';
import { OtpService } from '../shared/otp.service';
import { FirebaseAdminService } from '../shared/firebase-admin.service';
import { AppError } from '../common/app-error';
import { ApiPayload } from '../common/api-payload';
import { GoogleProfile } from '../auth/google-token.strategy';

// Public gym directory + self-signup — no auth required. A prospective
// member browses registered gyms and creates their own member account
// directly (no owner approval step), then buys a plan through the existing
// member subscription flow once logged in.
@Injectable()
export class PublicShopsService {
  constructor(
    @InjectModel(Shop.name) private readonly shop: Model<any>,
    @InjectModel(SubscriptionPlan.name) private readonly subscriptionPlan: Model<any>,
    @InjectModel(Role.name) private readonly role: Model<any>,
    @InjectModel(User.name) private readonly user: Model<any>,
    private readonly auth: AuthCryptoService,
    private readonly s3: S3Service,
    private readonly otp: OtpService,
    private readonly firebaseAdmin: FirebaseAdminService,
  ) {}

  private async serializeShop(shop: any) {
    return {
      id: shop.id,
      name: shop.name,
      address: shop.address,
      phone: shop.phone,
      email: shop.email,
      logoUrl: shop.logo_url ? await this.s3.getViewUrl(shop.logo_url) : null,
      coverImageUrl: shop.cover_image_url ? await this.s3.getViewUrl(shop.cover_image_url) : null,
      themeColor: shop.theme_color,
    };
  }

  // Gyms currently accepting members — i.e. the owner has an active
  // platform subscription. is_closed is a daily operational flag (today's
  // hours), not "not accepting members", so it isn't filtered out here.
  async listShops() {
    const shops = await this.shop.find({ is_active: true }).sort({ name: 1 });
    return Promise.all(shops.map((s) => this.serializeShop(s)));
  }

  async getShop(id: string) {
    const shop: any = await this.shop.findOne({ _id: id, is_active: true });
    if (!shop) throw new AppError('Gym not found', 404);

    const plans = await this.subscriptionPlan.find({ shop_id: id, is_active: true }).sort({ sell_price: 1 });

    return { ...(await this.serializeShop(shop)), plans };
  }

  // Creates the member account directly — no owner approval — and returns
  // a signed-in session (token + user), same shape as /auth/login, so the
  // app can drop the new member straight into the dashboard.
  async registerMember(shopId: string, body: any) {
    const shop: any = await this.shop.findOne({ _id: shopId, is_active: true });
    if (!shop) throw new AppError('Gym not found', 404);

    const { firstName, lastName, email, password, phone, gender } = body;
    if (!firstName || !lastName || !email || !password) {
      throw new AppError('firstName, lastName, email and password are required', 400);
    }
    if (String(password).length < 6) throw new AppError('Password must be at least 6 characters', 400);

    const existing = await this.user.findOne({ email });
    if (existing) throw new AppError('An account with this email already exists', 409);

    const memberRole: any = await this.role.findOne({ name: 'member' });
    if (!memberRole) throw new AppError('Member role not configured', 500);

    const password_hash = await this.auth.hash(password);
    const user: any = await this.user.create({
      role_id: memberRole.id,
      shop_id: shopId,
      first_name: firstName,
      last_name: lastName,
      email,
      password_hash,
      phone: phone || null,
      gender: gender || null,
      status: 'active',
    });

    const token = this.auth.sign({
      id: user.id,
      role: 'member',
      email: user.email,
      shop_id: shopId,
    });

    return new ApiPayload(
      {
        token,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: 'member',
          shopId,
          status: user.status,
          shopName: shop.name,
          shopLogoUrl: shop.logo_url ? await this.s3.getViewUrl(shop.logo_url) : null,
          shopThemeColor: shop.theme_color,
        },
      },
      'Account created — welcome!',
    );
  }

  // Same as registerMember, but identity is proven by a verified Google ID
  // token instead of a password.
  async registerMemberWithGoogle(shopId: string, profile: GoogleProfile, body: any) {
    const shop: any = await this.shop.findOne({ _id: shopId, is_active: true });
    if (!shop) throw new AppError('Gym not found', 404);

    const existing = await this.user.findOne({ email: profile.email });
    if (existing) throw new AppError('An account with this email already exists', 409);

    const memberRole: any = await this.role.findOne({ name: 'member' });
    if (!memberRole) throw new AppError('Member role not configured', 500);

    const { phone, gender } = body;
    // Google-authenticated accounts never get a real password — satisfies
    // the NOT NULL constraint but can never be used to log in with one.
    const password_hash = await this.auth.hash(`google:${randomUUID()}:${randomUUID()}`);
    const user: any = await this.user.create({
      role_id: memberRole.id,
      shop_id: shopId,
      first_name: profile.firstName,
      last_name: profile.lastName,
      email: profile.email,
      password_hash,
      phone: phone || null,
      gender: gender || null,
      status: 'active',
      google_id: profile.googleId,
    });

    const token = this.auth.sign({
      id: user.id,
      role: 'member',
      email: user.email,
      shop_id: shopId,
    });

    return new ApiPayload(
      {
        token,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: 'member',
          shopId,
          status: user.status,
          shopName: shop.name,
          shopLogoUrl: shop.logo_url ? await this.s3.getViewUrl(shop.logo_url) : null,
          shopThemeColor: shop.theme_color,
        },
      },
      'Account created — welcome!',
    );
  }

  // Same as registerMember, but identity is proven by a Firebase Phone Auth
  // ID token instead of a password. Email is still required (used as the
  // account's login identity); phone is the Firebase-verified number.
  async registerMemberWithPhone(shopId: string, body: any) {
    const shop: any = await this.shop.findOne({ _id: shopId, is_active: true });
    if (!shop) throw new AppError('Gym not found', 404);

    const { idToken, firstName, lastName, email, gender } = body;
    if (!firstName || !lastName || !email) {
      throw new AppError('firstName, lastName and email are required', 400);
    }
    const normalizedPhone = await this.firebaseAdmin.verifyPhoneToken(idToken);

    const existingEmail = await this.user.findOne({ email });
    if (existingEmail) throw new AppError('An account with this email already exists', 409);
    const existingPhone = await this.user.findOne({ phone: normalizedPhone });
    if (existingPhone) throw new AppError('An account with this phone number already exists', 409);

    const memberRole: any = await this.role.findOne({ name: 'member' });
    if (!memberRole) throw new AppError('Member role not configured', 500);

    const password_hash = await this.auth.hash(`passwordless:${randomUUID()}:${randomUUID()}`);
    const user: any = await this.user.create({
      role_id: memberRole.id,
      shop_id: shopId,
      first_name: firstName,
      last_name: lastName,
      email,
      password_hash,
      phone: normalizedPhone,
      gender: gender || null,
      status: 'active',
    });

    const token = this.auth.sign({
      id: user.id,
      role: 'member',
      email: user.email,
      shop_id: shopId,
    });

    return new ApiPayload(
      {
        token,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: 'member',
          shopId,
          status: user.status,
          shopName: shop.name,
          shopLogoUrl: shop.logo_url ? await this.s3.getViewUrl(shop.logo_url) : null,
          shopThemeColor: shop.theme_color,
        },
      },
      'Account created — welcome!',
    );
  }

  // Same as registerMember, but identity is proven by a WhatsApp OTP
  // instead of a password. Email is still required (used as the account's
  // login identity); phone is the OTP-verified number.
  async registerMemberWithWhatsApp(shopId: string, body: any) {
    const shop: any = await this.shop.findOne({ _id: shopId, is_active: true });
    if (!shop) throw new AppError('Gym not found', 404);

    const { phone, code, firstName, lastName, email, gender } = body;
    if (!phone || !code) throw new AppError('phone and code are required', 400);
    if (!firstName || !lastName || !email) {
      throw new AppError('firstName, lastName and email are required', 400);
    }
    const normalizedPhone = await this.otp.verifyAndConsume(phone, code);

    const existingEmail = await this.user.findOne({ email });
    if (existingEmail) throw new AppError('An account with this email already exists', 409);
    const existingPhone = await this.user.findOne({ phone: normalizedPhone });
    if (existingPhone) throw new AppError('An account with this phone number already exists', 409);

    const memberRole: any = await this.role.findOne({ name: 'member' });
    if (!memberRole) throw new AppError('Member role not configured', 500);

    const password_hash = await this.auth.hash(`passwordless:${randomUUID()}:${randomUUID()}`);
    const user: any = await this.user.create({
      role_id: memberRole.id,
      shop_id: shopId,
      first_name: firstName,
      last_name: lastName,
      email,
      password_hash,
      phone: normalizedPhone,
      gender: gender || null,
      status: 'active',
    });

    const token = this.auth.sign({
      id: user.id,
      role: 'member',
      email: user.email,
      shop_id: shopId,
    });

    return new ApiPayload(
      {
        token,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: 'member',
          shopId,
          status: user.status,
          shopName: shop.name,
          shopLogoUrl: shop.logo_url ? await this.s3.getViewUrl(shop.logo_url) : null,
          shopThemeColor: shop.theme_color,
        },
      },
      'Account created — welcome!',
    );
  }
}
