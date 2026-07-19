import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { randomUUID } from 'crypto';
import { User, Role, Shop, Referral } from '../models';
import { AuthCryptoService } from '../common/auth-crypto.service';
import { AppError } from '../common/app-error';
import { ApiPayload } from '../common/api-payload';
import { generateUniqueReferralCode } from '../common/referral-code';
import { S3Service } from '../shared/s3.service';
import { OtpService } from '../shared/otp.service';
import { GoogleProfile } from './google-token.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User) private readonly user: typeof User,
    @InjectModel(Role) private readonly role: typeof Role,
    @InjectModel(Shop) private readonly shop: typeof Shop,
    @InjectModel(Referral) private readonly referral: typeof Referral,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly auth: AuthCryptoService,
    private readonly s3: S3Service,
    private readonly otp: OtpService,
  ) {}

  // Resolves a referral code to the referring shop for owner registration.
  // A bad/unknown code, or a code that resolves back to the same person
  // registering (matched by phone — email can't collide, it's globally
  // unique), is treated as "no referral" rather than failing the signup —
  // a typo or a self-share shouldn't block someone from creating their
  // account.
  private async resolveReferrer(
    referralCode: string | undefined | null,
    registrantPhone: string | undefined | null,
    t: any,
  ): Promise<any> {
    if (!referralCode) return null;
    const referrerShop: any = await this.shop.findOne({
      where: { referral_code: referralCode.trim().toUpperCase() },
      transaction: t,
    });
    if (!referrerShop) return null;

    if (registrantPhone) {
      const referrerOwner: any = await this.user.findOne({
        where: { id: referrerShop.owner_id },
        transaction: t,
      });
      if (referrerOwner?.phone && referrerOwner.phone === registrantPhone) return null;
    }
    return referrerShop;
  }

  // Shared by login/me so every role (admin/trainer/member) sees their
  // shop's branding — name, logo, theme color — plus whether the owner has
  // marked the gym closed today, in the client, not just the owner.
  private async resolveShopBranding(
    shopId: string | null | undefined,
  ): Promise<{ name: string | null; logoUrl: string | null; themeColor: string | null; isClosed: boolean }> {
    if (!shopId) return { name: null, logoUrl: null, themeColor: null, isClosed: false };
    const shop: any = await this.shop.findByPk(shopId, {
      attributes: ['name', 'logo_url', 'theme_color', 'is_closed'],
    });
    return {
      name: shop?.name ?? null,
      logoUrl: shop?.logo_url ? await this.s3.getViewUrl(shop.logo_url) : null,
      themeColor: shop?.theme_color ?? null,
      isClosed: shop?.is_closed ?? false,
    };
  }

  // Single source of truth for the "user" shape returned by both login and
  // me — they drifted apart before (login was missing phone/gender/status/
  // specialization/salary/bio), so a freshly logged-in session showed a
  // half-empty profile until the app was restarted and /auth/me ran.
  private async serializeUser(user: any): Promise<any> {
    const branding = await this.resolveShopBranding(user.shop_id);
    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.Role.name,
      shopId: user.shop_id,
      phone: user.phone,
      gender: user.gender,
      profilePic: user.profile_pic ? await this.s3.getViewUrl(user.profile_pic) : null,
      shopName: branding.name,
      shopLogoUrl: branding.logoUrl,
      shopThemeColor: branding.themeColor,
      shopIsClosed: branding.isClosed,
      status: user.status,
      specialization: user.specialization,
      salary: user.salary,
      bio: user.bio,
    };
  }

  async login(body: any) {
    const { email, password } = body;
    if (!email || !password) throw new AppError('Email and password required', 400);

    const user: any = await this.user.scope('withPassword').findOne({
      where: { email },
      include: [{ model: Role, attributes: ['name'] }],
    });

    if (!user) throw new AppError('Invalid credentials', 401);
    if (user.status !== 'active') throw new AppError('Account is inactive or suspended', 403);

    const valid = await this.auth.compare(password, user.password_hash);
    if (!valid) throw new AppError('Invalid credentials', 401);

    const token = this.auth.sign({
      id: user.id,
      role: user.Role.name,
      email: user.email,
      shop_id: user.shop_id,
    });

    return {
      token,
      user: await this.serializeUser(user),
    };
  }

  // Google/WhatsApp-authenticated accounts never get a real password — this
  // hash satisfies the NOT NULL constraint but can never match anything a
  // user could actually type, so password login is permanently unavailable
  // for them (they can only sign in via the method they registered with)
  // unless a future "set password" flow generates a real one.
  private unusablePasswordHash(): Promise<string> {
    return this.auth.hash(`passwordless:${randomUUID()}:${randomUUID()}`);
  }

  // Google is just an alternate way to authenticate into an EXISTING
  // account here — matched by the verified email from the Google ID token.
  // No account is created; see registerOwnerWithGoogle / PublicShopsService
  // .registerMemberWithGoogle for the two Google-based signup paths.
  async loginWithGoogle(profile: GoogleProfile) {
    const user: any = await this.user.findOne({
      where: { email: profile.email },
      include: [{ model: Role, attributes: ['name'] }],
    });

    if (!user) {
      throw new AppError(
        'No account found for this Google account. Create a gym or join one first.',
        404,
      );
    }
    if (user.status !== 'active') throw new AppError('Account is inactive or suspended', 403);

    if (!user.google_id) {
      // First time this existing (password-based) account signs in with
      // Google — link it so future sign-ins are instant.
      await user.update({ google_id: profile.googleId });
    }

    const token = this.auth.sign({
      id: user.id,
      role: user.Role.name,
      email: user.email,
      shop_id: user.shop_id,
    });

    return {
      token,
      user: await this.serializeUser(user),
    };
  }

  async registerOwner(body: any) {
    const t = await this.sequelize.transaction();
    try {
      const { firstName, lastName, email, password, shopName, shopPhone, shopEmail, referralCode } = body;
      if (!firstName || !lastName || !email || !password || !shopName) {
        throw new AppError('firstName, lastName, email, password and shopName are required', 400);
      }
      if (String(password).length < 6) throw new AppError('Password must be at least 6 characters', 400);

      const existing = await this.user.findOne({ where: { email }, transaction: t });
      if (existing) throw new AppError('An account with this email already exists', 409);

      const adminRole = await this.role.findOne({ where: { name: 'admin' }, transaction: t });
      if (!adminRole) throw new AppError('Admin role not configured', 500);

      const referrerShop = await this.resolveReferrer(referralCode, shopPhone, t);

      const password_hash = await this.auth.hash(password);
      const owner: any = await this.user.create(
        {
          role_id: adminRole.id,
          first_name: firstName,
          last_name: lastName,
          email,
          password_hash,
          phone: shopPhone || null,
          status: 'active',
        } as any,
        { transaction: t },
      );

      const newReferralCode = await generateUniqueReferralCode(this.shop, t);
      const shop: any = await this.shop.create(
        {
          name: shopName,
          owner_id: owner.id,
          phone: shopPhone || null,
          email: shopEmail || email,
          is_active: false,
          referral_code: newReferralCode,
          referred_by_shop_id: referrerShop?.id ?? null,
        } as any,
        { transaction: t },
      );

      await owner.update({ shop_id: shop.id }, { transaction: t });

      if (referrerShop) {
        await this.referral.create(
          { referrer_shop_id: referrerShop.id, referred_shop_id: shop.id, status: 'pending' } as any,
          { transaction: t },
        );
      }

      await t.commit();

      const token = this.auth.sign({
        id: owner.id,
        role: 'admin',
        email: owner.email,
        shop_id: shop.id,
      });

      return new ApiPayload(
        {
          token,
          user: {
            id: owner.id,
            firstName: owner.first_name,
            lastName: owner.last_name,
            email: owner.email,
            role: 'admin',
            shopId: shop.id,
          },
          shop: { id: shop.id, name: shop.name, isActive: shop.is_active },
        },
        'Account created',
      );
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  // Same as registerOwner, but identity is proven by a verified Google ID
  // token instead of a password — only shopName/shopPhone are still needed
  // from the client.
  async registerOwnerWithGoogle(profile: GoogleProfile, body: any) {
    const t = await this.sequelize.transaction();
    try {
      const { shopName, shopPhone, shopEmail, referralCode } = body;
      if (!shopName) throw new AppError('shopName is required', 400);

      const existing = await this.user.findOne({ where: { email: profile.email }, transaction: t });
      if (existing) throw new AppError('An account with this email already exists', 409);

      const adminRole = await this.role.findOne({ where: { name: 'admin' }, transaction: t });
      if (!adminRole) throw new AppError('Admin role not configured', 500);

      const referrerShop = await this.resolveReferrer(referralCode, shopPhone, t);

      const password_hash = await this.unusablePasswordHash();
      const owner: any = await this.user.create(
        {
          role_id: adminRole.id,
          first_name: profile.firstName,
          last_name: profile.lastName,
          email: profile.email,
          password_hash,
          phone: shopPhone || null,
          status: 'active',
          google_id: profile.googleId,
        } as any,
        { transaction: t },
      );

      const newReferralCode = await generateUniqueReferralCode(this.shop, t);
      const shop: any = await this.shop.create(
        {
          name: shopName,
          owner_id: owner.id,
          phone: shopPhone || null,
          email: shopEmail || profile.email,
          is_active: false,
          referral_code: newReferralCode,
          referred_by_shop_id: referrerShop?.id ?? null,
        } as any,
        { transaction: t },
      );

      await owner.update({ shop_id: shop.id }, { transaction: t });

      if (referrerShop) {
        await this.referral.create(
          { referrer_shop_id: referrerShop.id, referred_shop_id: shop.id, status: 'pending' } as any,
          { transaction: t },
        );
      }

      await t.commit();

      const token = this.auth.sign({
        id: owner.id,
        role: 'admin',
        email: owner.email,
        shop_id: shop.id,
      });

      return new ApiPayload(
        {
          token,
          user: {
            id: owner.id,
            firstName: owner.first_name,
            lastName: owner.last_name,
            email: owner.email,
            role: 'admin',
            shopId: shop.id,
          },
          shop: { id: shop.id, name: shop.name, isActive: shop.is_active },
        },
        'Account created',
      );
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async sendWhatsAppOtp(body: any) {
    const { phone } = body;
    if (!phone) throw new AppError('phone is required', 400);
    const result = await this.otp.sendOtp(phone);
    return new ApiPayload(
      result,
      result.sent ? 'Code sent via WhatsApp' : 'Code generated (WhatsApp not configured — see devCode)',
    );
  }

  // WhatsApp OTP is just an alternate way to authenticate into an EXISTING
  // account, matched by phone number — same shape as loginWithGoogle. No
  // account is created; see registerOwnerWithWhatsApp / PublicShopsService
  // .registerMemberWithWhatsApp for the two WhatsApp-based signup paths.
  async loginWithWhatsApp(body: any) {
    const { phone, code } = body;
    if (!phone || !code) throw new AppError('phone and code are required', 400);
    const normalizedPhone = await this.otp.verifyAndConsume(phone, code);

    const user: any = await this.user.findOne({
      where: { phone: normalizedPhone },
      include: [{ model: Role, attributes: ['name'] }],
      order: [['created_at', 'ASC']],
    });

    if (!user) {
      throw new AppError(
        'No account found for this phone number. Create a gym or join one first.',
        404,
      );
    }
    if (user.status !== 'active') throw new AppError('Account is inactive or suspended', 403);

    const token = this.auth.sign({
      id: user.id,
      role: user.Role.name,
      email: user.email,
      shop_id: user.shop_id,
    });

    return {
      token,
      user: await this.serializeUser(user),
    };
  }

  // Same as registerOwner, but identity is proven by a WhatsApp OTP instead
  // of a password — email is still required (used for the account's login
  // identity/contact), phone is the OTP-verified number.
  async registerOwnerWithWhatsApp(body: any) {
    const t = await this.sequelize.transaction();
    try {
      const { phone, code, firstName, lastName, email, shopName, shopEmail, referralCode } = body;
      if (!phone || !code) throw new AppError('phone and code are required', 400);
      if (!firstName || !lastName || !email || !shopName) {
        throw new AppError('firstName, lastName, email and shopName are required', 400);
      }
      const normalizedPhone = await this.otp.verifyAndConsume(phone, code);

      const existingEmail = await this.user.findOne({ where: { email }, transaction: t });
      if (existingEmail) throw new AppError('An account with this email already exists', 409);
      const existingPhone = await this.user.findOne({ where: { phone: normalizedPhone }, transaction: t });
      if (existingPhone) throw new AppError('An account with this phone number already exists', 409);

      const adminRole = await this.role.findOne({ where: { name: 'admin' }, transaction: t });
      if (!adminRole) throw new AppError('Admin role not configured', 500);

      const referrerShop = await this.resolveReferrer(referralCode, normalizedPhone, t);

      const password_hash = await this.unusablePasswordHash();
      const owner: any = await this.user.create(
        {
          role_id: adminRole.id,
          first_name: firstName,
          last_name: lastName,
          email,
          password_hash,
          phone: normalizedPhone,
          status: 'active',
        } as any,
        { transaction: t },
      );

      const newReferralCode = await generateUniqueReferralCode(this.shop, t);
      const shop: any = await this.shop.create(
        {
          name: shopName,
          owner_id: owner.id,
          phone: normalizedPhone,
          email: shopEmail || email,
          is_active: false,
          referral_code: newReferralCode,
          referred_by_shop_id: referrerShop?.id ?? null,
        } as any,
        { transaction: t },
      );

      await owner.update({ shop_id: shop.id }, { transaction: t });

      if (referrerShop) {
        await this.referral.create(
          { referrer_shop_id: referrerShop.id, referred_shop_id: shop.id, status: 'pending' } as any,
          { transaction: t },
        );
      }

      await t.commit();

      const token = this.auth.sign({
        id: owner.id,
        role: 'admin',
        email: owner.email,
        shop_id: shop.id,
      });

      return new ApiPayload(
        {
          token,
          user: {
            id: owner.id,
            firstName: owner.first_name,
            lastName: owner.last_name,
            email: owner.email,
            role: 'admin',
            shopId: shop.id,
          },
          shop: { id: shop.id, name: shop.name, isActive: shop.is_active },
        },
        'Account created',
      );
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  // Self-service deletion, proven by email+password (same as login) rather
  // than a JWT — matches Play Store's account-deletion requirement, which
  // must work as a standalone flow, not just from inside a logged-in app.
  //
  // We anonymize instead of hard-deleting: attendance, subscriptions,
  // orders, ledger entries, and workout/diet plans all reference this user,
  // and other people's records (a trainer's assigned workouts, a shop's
  // financial history) shouldn't disappear because one account deleted
  // itself. Scrubbing PII and disabling login satisfies "delete my account"
  // without breaking foreign keys or anyone else's data. If the account
  // owns a shop, that shop is deactivated too so members/trainers can no
  // longer use it.
  async deleteAccount(body: any) {
    const { email, password } = body;
    if (!email || !password) throw new AppError('Email and password required', 400);

    const user: any = await this.user.scope('withPassword').findOne({
      where: { email },
      include: [{ model: Role, attributes: ['name'] }],
    });

    if (!user || user.deleted_at) throw new AppError('Invalid credentials', 401);

    const valid = await this.auth.compare(password, user.password_hash);
    if (!valid) throw new AppError('Invalid credentials', 401);

    const t = await this.sequelize.transaction();
    try {
      const oldProfilePic = user.profile_pic;
      const oldGovtIdUrl = user.govt_id_url;

      await user.update(
        {
          first_name: 'Deleted',
          last_name: 'User',
          email: `deleted-${user.id}@deleted.gymaxis.app`,
          password_hash: await this.unusablePasswordHash(),
          phone: null,
          date_of_birth: null,
          gender: null,
          profile_pic: null,
          emergency_contact: null,
          specialization: null,
          bio: null,
          govt_id_url: null,
          fcm_token: null,
          google_id: null,
          status: 'inactive',
          deleted_at: new Date(),
        },
        { transaction: t },
      );

      if (user.Role.name === 'admin') {
        await this.shop.update(
          { is_active: false },
          { where: { owner_id: user.id }, transaction: t },
        );
      }

      await t.commit();

      if (oldProfilePic) this.s3.deleteObject(oldProfilePic).catch(() => {});
      if (oldGovtIdUrl) this.s3.deleteObject(oldGovtIdUrl).catch(() => {});

      return new ApiPayload(null, 'Account deleted');
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async me(userId: string) {
    const user: any = await this.user.findByPk(userId, {
      include: [{ model: Role, attributes: ['name'] }],
    });
    if (!user) throw new AppError('User not found', 404);
    return this.serializeUser(user);
  }

  // Step 1: client asks for a short-lived signed URL to PUT the image directly to S3.
  async presignProfilePicture(userId: string, shopId: string | null, role: string, body: any) {
    const { contentType } = body;
    if (!contentType) throw new AppError('contentType required', 400);

    const key = this.s3.buildProfilePictureKey(shopId, role, contentType);
    const uploadUrl = await this.s3.getUploadUrl(key, contentType);
    return new ApiPayload({ uploadUrl, key }, 'Upload URL generated');
  }

  // Step 2: after the client PUTs the file to S3, it confirms the key so we persist it.
  async updateProfilePicture(userId: string, shopId: string | null, role: string, body: any) {
    const { key } = body;
    if (!key) throw new AppError('key required', 400);
    const segment = role === 'admin' ? 'shop' : 'users';
    const expectedPrefix = `${shopId ?? 'platform'}/${segment}/profiles/avatar_`;
    if (!key.startsWith(expectedPrefix)) throw new AppError('Invalid object key', 400);

    const user: any = await this.user.findByPk(userId);
    if (!user) throw new AppError('User not found', 404);

    const oldKey = user.profile_pic;
    await user.update({ profile_pic: key });
    if (oldKey && oldKey !== key) {
      this.s3.deleteObject(oldKey).catch(() => {});
    }

    const profilePic = await this.s3.getViewUrl(key);
    return new ApiPayload({ profilePic }, 'Profile picture updated');
  }

  async removeProfilePicture(userId: string) {
    const user: any = await this.user.findByPk(userId);
    if (!user) throw new AppError('User not found', 404);

    const oldKey = user.profile_pic;
    if (!oldKey) return new ApiPayload(null, 'No profile picture to remove');

    await user.update({ profile_pic: null });
    this.s3.deleteObject(oldKey).catch(() => {});

    return new ApiPayload(null, 'Profile picture removed');
  }

  async changePassword(userId: string, body: any) {
    const { currentPassword, newPassword } = body;
    const user: any = await this.user.scope('withPassword').findByPk(userId);
    const valid = await this.auth.compare(currentPassword, user.password_hash);
    if (!valid) throw new AppError('Current password incorrect', 400);
    const hash = await this.auth.hash(newPassword);
    await user.update({ password_hash: hash });
    return new ApiPayload(null, 'Password changed successfully');
  }

  // Single token per user — the most recently logged-in device receives
  // pushes. Called on app start/login (set) and logout (cleared).
  async updateFcmToken(userId: string, body: any) {
    const { fcmToken } = body;
    const user: any = await this.user.findByPk(userId);
    if (!user) throw new AppError('User not found', 404);
    await user.update({ fcm_token: fcmToken || null });
    return new ApiPayload(null, fcmToken ? 'Device registered for push notifications' : 'Device unregistered');
  }
}
