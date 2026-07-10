import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { User, Role, Shop } from '../models';
import { AuthCryptoService } from '../common/auth-crypto.service';
import { AppError } from '../common/app-error';
import { ApiPayload } from '../common/api-payload';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User) private readonly user: typeof User,
    @InjectModel(Role) private readonly role: typeof Role,
    @InjectModel(Shop) private readonly shop: typeof Shop,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly auth: AuthCryptoService,
  ) {}

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
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.Role.name,
        shopId: user.shop_id,
        profilePic: user.profile_pic,
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

  async me(userId: number) {
    const user: any = await this.user.findByPk(userId, {
      include: [{ model: Role, attributes: ['name'] }],
    });
    if (!user) throw new AppError('User not found', 404);
    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.Role.name,
      shopId: user.shop_id,
      phone: user.phone,
      gender: user.gender,
      profilePic: user.profile_pic,
      status: user.status,
      specialization: user.specialization,
      bio: user.bio,
    };
  }

  async changePassword(userId: number, body: any) {
    const { currentPassword, newPassword } = body;
    const user: any = await this.user.scope('withPassword').findByPk(userId);
    const valid = await this.auth.compare(currentPassword, user.password_hash);
    if (!valid) throw new AppError('Current password incorrect', 400);
    const hash = await this.auth.hash(newPassword);
    await user.update({ password_hash: hash });
    return new ApiPayload(null, 'Password changed successfully');
  }
}
