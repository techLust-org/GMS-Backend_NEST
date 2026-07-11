import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { User, Role, Shop } from '../models';
import { AuthCryptoService } from '../common/auth-crypto.service';
import { AppError } from '../common/app-error';
import { ApiPayload } from '../common/api-payload';
import { S3Service } from '../shared/s3.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User) private readonly user: typeof User,
    @InjectModel(Role) private readonly role: typeof Role,
    @InjectModel(Shop) private readonly shop: typeof Shop,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly auth: AuthCryptoService,
    private readonly s3: S3Service,
  ) {}

  // Shared by login/me so every role (admin/trainer/member) sees their
  // shop's branding — logo + theme color — in the client, not just the owner.
  private async resolveShopBranding(
    shopId: string | null | undefined,
  ): Promise<{ logoUrl: string | null; themeColor: string | null }> {
    if (!shopId) return { logoUrl: null, themeColor: null };
    const shop: any = await this.shop.findByPk(shopId, { attributes: ['logo_url', 'theme_color'] });
    return {
      logoUrl: shop?.logo_url ? await this.s3.getViewUrl(shop.logo_url) : null,
      themeColor: shop?.theme_color ?? null,
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

    const branding = await this.resolveShopBranding(user.shop_id);

    return {
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.Role.name,
        shopId: user.shop_id,
        profilePic: user.profile_pic ? await this.s3.getViewUrl(user.profile_pic) : null,
        shopLogoUrl: branding.logoUrl,
        shopThemeColor: branding.themeColor,
      },
    };
  }

  async registerOwner(body: any) {
    const t = await this.sequelize.transaction();
    try {
      const { firstName, lastName, email, password, shopName, shopPhone, shopEmail } = body;
      if (!firstName || !lastName || !email || !password || !shopName) {
        throw new AppError('firstName, lastName, email, password and shopName are required', 400);
      }
      if (String(password).length < 6) throw new AppError('Password must be at least 6 characters', 400);

      const existing = await this.user.findOne({ where: { email }, transaction: t });
      if (existing) throw new AppError('An account with this email already exists', 409);

      const adminRole = await this.role.findOne({ where: { name: 'admin' }, transaction: t });
      if (!adminRole) throw new AppError('Admin role not configured', 500);

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

      const shop: any = await this.shop.create(
        {
          name: shopName,
          owner_id: owner.id,
          phone: shopPhone || null,
          email: shopEmail || email,
          is_active: false,
        } as any,
        { transaction: t },
      );

      await owner.update({ shop_id: shop.id }, { transaction: t });

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

  async me(userId: string) {
    const user: any = await this.user.findByPk(userId, {
      include: [{ model: Role, attributes: ['name'] }],
    });
    if (!user) throw new AppError('User not found', 404);
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
      shopLogoUrl: branding.logoUrl,
      shopThemeColor: branding.themeColor,
      status: user.status,
      specialization: user.specialization,
      bio: user.bio,
    };
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
}
