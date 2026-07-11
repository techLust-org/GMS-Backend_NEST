import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op, fn, col } from 'sequelize';
import { randomBytes } from 'crypto';
import {
  Shop, ShopSubscription, ShopSubscriptionPlan, User, Role, Subscription, Product, Expense,
} from '../models';
import { AuthCryptoService } from '../common/auth-crypto.service';
import { NotificationService } from '../shared/notification.service';
import { S3Service } from '../shared/s3.service';
import { MailService } from '../shared/mail.service';
import { AppError } from '../common/app-error';
import { ApiPayload } from '../common/api-payload';

// Unambiguous character set (no 0/O/1/l/I) so temp passwords are easy to
// read/retype if the super-admin has to relay one manually.
const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
function generateTempPassword(length = 12): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += TEMP_PASSWORD_CHARS[bytes[i] % TEMP_PASSWORD_CHARS.length];
  return out;
}

const today = () => new Date().toISOString().split('T')[0];
const addDays = (base: any, n: number) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };
const iso = (d: any) => new Date(d).toISOString().split('T')[0];

@Injectable()
export class SuperadminService {
  constructor(
    @InjectModel(Shop) private readonly shop: typeof Shop,
    @InjectModel(ShopSubscription) private readonly shopSubscription: typeof ShopSubscription,
    @InjectModel(ShopSubscriptionPlan) private readonly shopSubscriptionPlan: typeof ShopSubscriptionPlan,
    @InjectModel(User) private readonly user: typeof User,
    @InjectModel(Role) private readonly role: typeof Role,
    @InjectModel(Subscription) private readonly subscription: typeof Subscription,
    @InjectModel(Product) private readonly product: typeof Product,
    @InjectModel(Expense) private readonly expense: typeof Expense,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly auth: AuthCryptoService,
    private readonly notificationService: NotificationService,
    private readonly s3: S3Service,
    private readonly mail: MailService,
  ) {}

  private activeSubFor(shopId: string) {
    return this.shopSubscription.findOne({
      where: { shop_id: shopId, status: 'active', end_date: { [Op.gte]: today() } },
      include: [{ model: ShopSubscriptionPlan, as: 'plan' }],
      order: [['end_date', 'DESC']],
    });
  }

  async stats() {
    const [roles, shops, activeSubs] = await Promise.all([
      this.role.findAll(),
      this.shop.findAll({ attributes: ['id', 'is_active', 'createdAt'] }),
      this.shopSubscription.findAll({
        where: { status: 'active', end_date: { [Op.gte]: today() } },
        attributes: ['shop_id'],
      }),
    ]);

    const roleId: any = Object.fromEntries(roles.map((r: any) => [r.name, r.id]));
    const activeShopIds = new Set(activeSubs.map((s: any) => s.shop_id));

    const [owners, trainers, members, revenueRow, mrrRow]: any = await Promise.all([
      this.user.count({ where: { role_id: roleId.admin } }),
      this.user.count({ where: { role_id: roleId.trainer } }),
      this.user.count({ where: { role_id: roleId.member } }),
      this.shopSubscription.findOne({
        attributes: [[fn('COALESCE', fn('SUM', col('sell_price')), 0), 'total']],
        raw: true,
      }),
      this.shopSubscription.findOne({
        where: { status: 'active', end_date: { [Op.gte]: today() } },
        attributes: [[fn('COALESCE', fn('SUM', col('sell_price')), 0), 'total']],
        raw: true,
      }),
    ]);

    const thirtyDaysAgo = iso(addDays(new Date(), -30));
    const newShops = shops.filter((s: any) => iso(s.createdAt) >= thirtyDaysAgo).length;

    return {
      totalShops: shops.length,
      activeShops: activeShopIds.size,
      inactiveShops: shops.length - activeShopIds.size,
      newShops30d: newShops,
      totalOwners: owners,
      totalTrainers: trainers,
      totalMembers: members,
      totalUsers: owners + trainers + members,
      totalRevenue: Number(revenueRow.total),
      activeRecurringRevenue: Number(mrrRow.total),
    };
  }

  async listShops(query: any) {
    const { search, status } = query;
    const where: any = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const shops: any[] = await this.shop.findAll({
      where,
      include: [
        { model: User, as: 'owner', attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'status'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const memberRole: any = await this.role.findOne({ where: { name: 'member' } });

    const data = await Promise.all(shops.map(async (shop: any) => {
      const sub: any = await this.activeSubFor(shop.id);
      const memberCount = await this.user.count({ where: { shop_id: shop.id, role_id: memberRole.id } });
      const daysLeft = sub ? Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / 86400000) : null;
      const isActive = !!sub;
      return {
        id: shop.id,
        name: shop.name,
        email: shop.email,
        phone: shop.phone,
        address: shop.address,
        logoUrl: shop.logo_url,
        themeColor: shop.theme_color,
        createdAt: shop.createdAt,
        owner: shop.owner ? {
          id: shop.owner.id,
          name: `${shop.owner.first_name} ${shop.owner.last_name}`,
          email: shop.owner.email,
          phone: shop.owner.phone,
          status: shop.owner.status,
        } : null,
        isActive,
        memberCount,
        subscription: sub ? {
          id: sub.id,
          planName: sub.plan ? sub.plan.name : null,
          startDate: sub.start_date,
          endDate: sub.end_date,
          daysLeft,
          sellPrice: Number(sub.sell_price),
        } : null,
      };
    }));

    return status === 'active'
      ? data.filter((s) => s.isActive)
      : status === 'inactive'
        ? data.filter((s) => !s.isActive)
        : data;
  }

  // Step 1: presign a spot in S3 for the new owner's profile picture, before
  // the shop/user even exist — namespaced under "platform" like any other
  // account with no shop yet.
  async presignOwnerAvatar(body: any) {
    const { contentType } = body;
    if (!contentType) throw new AppError('contentType required', 400);
    const key = this.s3.buildProfilePictureKey(null, 'admin', contentType);
    const uploadUrl = await this.s3.getUploadUrl(key, contentType);
    return new ApiPayload({ uploadUrl, key }, 'Upload URL generated');
  }

  async createShop(body: any) {
    const {
      shopName, ownerFirstName, ownerLastName, ownerEmail, ownerPhone, profilePicKey,
    } = body;
    if (!shopName || !ownerFirstName || !ownerLastName || !ownerEmail) {
      throw new AppError('shopName, ownerFirstName, ownerLastName and ownerEmail are required', 400);
    }
    if (profilePicKey && !String(profilePicKey).startsWith('platform/shop/profiles/avatar_')) {
      throw new AppError('Invalid profile picture key', 400);
    }

    const t = await this.sequelize.transaction();
    try {
      const existing = await this.user.findOne({ where: { email: ownerEmail }, transaction: t });
      if (existing) throw new AppError('An account with this email already exists', 409);

      const adminRole = await this.role.findOne({ where: { name: 'admin' }, transaction: t });
      if (!adminRole) throw new AppError('Admin role not configured', 500);

      const tempPassword = generateTempPassword();
      const password_hash = await this.auth.hash(tempPassword);

      const owner: any = await this.user.create(
        {
          role_id: adminRole.id,
          first_name: ownerFirstName,
          last_name: ownerLastName,
          email: ownerEmail,
          password_hash,
          phone: ownerPhone || null,
          profile_pic: profilePicKey || null,
          status: 'active',
        } as any,
        { transaction: t },
      );

      const shop: any = await this.shop.create(
        {
          name: shopName,
          owner_id: owner.id,
          phone: ownerPhone || null,
          email: ownerEmail,
          is_active: false,
        } as any,
        { transaction: t },
      );

      await owner.update({ shop_id: shop.id }, { transaction: t });
      await t.commit();

      const emailSent = await this.mail.sendOwnerWelcomeEmail(
        ownerEmail, ownerFirstName, shopName, tempPassword,
      );

      return new ApiPayload(
        {
          shop: { id: shop.id, name: shop.name },
          owner: { id: owner.id, email: owner.email },
          emailSent,
          // Only handed back when the email couldn't be sent, so the
          // super-admin can relay it manually — never returned otherwise.
          tempPassword: emailSent ? undefined : tempPassword,
        },
        emailSent ? 'Owner created and welcome email sent' : 'Owner created, but the welcome email could not be sent',
      );
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async shopDetail(id: string) {
    const shop: any = await this.shop.findByPk(id, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'status', 'createdAt'] }],
    });
    if (!shop) throw new AppError('Shop not found', 404);

    const roles = await this.role.findAll();
    const roleId: any = Object.fromEntries(roles.map((r: any) => [r.name, r.id]));

    const [subHistory, trainers, members, productCount, memberSubsRow, expenseRow]: any = await Promise.all([
      this.shopSubscription.findAll({
        where: { shop_id: shop.id },
        include: [{ model: ShopSubscriptionPlan, as: 'plan', attributes: ['name', 'plan_type'] }],
        order: [['created_at', 'DESC']],
      }),
      this.user.count({ where: { shop_id: shop.id, role_id: roleId.trainer } }),
      this.user.count({ where: { shop_id: shop.id, role_id: roleId.member } }),
      this.product.count({ where: { shop_id: shop.id } }),
      this.subscription.findOne({
        where: { shop_id: shop.id },
        attributes: [[fn('COALESCE', fn('SUM', col('sell_price')), 0), 'total']],
        raw: true,
      }),
      this.expense.findOne({
        where: { shop_id: shop.id },
        attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
        raw: true,
      }),
    ]);

    const active = await this.activeSubFor(shop.id);

    return {
      id: shop.id,
      name: shop.name,
      email: shop.email,
      phone: shop.phone,
      address: shop.address,
      logoUrl: shop.logo_url,
      themeColor: shop.theme_color,
      createdAt: shop.createdAt,
      isActive: !!active,
      owner: shop.owner ? {
        id: shop.owner.id,
        name: `${shop.owner.first_name} ${shop.owner.last_name}`,
        email: shop.owner.email,
        phone: shop.owner.phone,
        status: shop.owner.status,
        joinedAt: shop.owner.createdAt,
      } : null,
      counts: {
        trainers,
        members,
        products: productCount,
      },
      shopRevenue: Number(memberSubsRow.total),
      shopExpenses: Number(expenseRow.total),
      subscriptions: subHistory.map((s: any) => ({
        id: s.id,
        planName: s.plan ? s.plan.name : null,
        planType: s.plan ? s.plan.plan_type : null,
        status: s.status,
        startDate: s.start_date,
        endDate: s.end_date,
        sellPrice: Number(s.sell_price),
        razorpayPaymentId: s.razorpay_payment_id,
        createdAt: s.createdAt,
      })),
    };
  }

  async grant(id: string, body: any) {
    const t = await this.sequelize.transaction();
    try {
      const { planId, days } = body;
      const shop: any = await this.shop.findByPk(id, { transaction: t });
      if (!shop) throw new AppError('Shop not found', 404);

      const plan: any = await this.shopSubscriptionPlan.findByPk(planId, { transaction: t });
      if (!plan) throw new AppError('Invalid plan', 400);

      const duration = Number(days) > 0 ? Number(days) : plan.duration_days;

      const current: any = await this.shopSubscription.findOne({
        where: { shop_id: shop.id, status: 'active', end_date: { [Op.gte]: today() } },
        order: [['end_date', 'DESC']],
        transaction: t,
      });
      let startDate: any = new Date();
      if (current) {
        startDate = new Date(current.end_date);
        await current.update({ status: 'expired' }, { transaction: t });
      }
      const endDate = addDays(startDate, duration);

      const sub = await this.shopSubscription.create({
        shop_id: shop.id,
        plan_id: plan.id,
        base_price: plan.base_price,
        sell_price: 0,
        status: 'active',
        start_date: iso(startDate),
        end_date: iso(endDate),
        razorpay_payment_id: 'MANUAL_GRANT',
      } as any, { transaction: t });

      await shop.update({ is_active: true }, { transaction: t });
      await t.commit();

      return new ApiPayload(sub, `Granted ${duration} days of ${plan.name}`);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async revoke(id: string) {
    const t = await this.sequelize.transaction();
    try {
      const shop: any = await this.shop.findByPk(id, { transaction: t });
      if (!shop) throw new AppError('Shop not found', 404);

      await this.shopSubscription.update(
        { status: 'cancelled' },
        { where: { shop_id: shop.id, status: 'active' }, transaction: t },
      );
      await shop.update({ is_active: false }, { transaction: t });
      await t.commit();

      return new ApiPayload(null, 'Access revoked. The gym is now blocked.');
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async extend(id: string, body: any) {
    const { days } = body;
    const n = Number(days);
    if (!n || n <= 0) throw new AppError('days must be a positive number', 400);

    const sub: any = await this.activeSubFor(id);
    if (!sub) throw new AppError('No active subscription to extend. Use grant instead.', 400);

    const newEnd = addDays(sub.end_date, n);
    await sub.update({ end_date: iso(newEnd) });
    await this.shop.update({ is_active: true }, { where: { id } });

    return new ApiPayload({ endDate: iso(newEnd) }, `Extended by ${n} days`);
  }

  async setOwnerStatus(id: string, body: any) {
    const { status } = body;
    if (!['active', 'suspended'].includes(status)) throw new AppError('Invalid status', 400);

    const shop: any = await this.shop.findByPk(id);
    if (!shop) throw new AppError('Shop not found', 404);

    await this.user.update({ status }, { where: { id: shop.owner_id } });
    return new ApiPayload(null, `Owner account ${status}`);
  }

  async setShopTheme(id: string, body: any) {
    const { themeColor } = body;
    if (themeColor !== null && themeColor !== undefined && themeColor !== '') {
      if (!/^#[0-9A-Fa-f]{6}$/.test(themeColor)) {
        throw new AppError('themeColor must be a hex color like #D7FF45', 400);
      }
    }

    const shop: any = await this.shop.findByPk(id);
    if (!shop) throw new AppError('Shop not found', 404);

    const normalized = themeColor ? themeColor : null;
    await shop.update({ theme_color: normalized });
    return new ApiPayload({ themeColor: normalized }, normalized ? 'Theme color updated' : 'Theme color reset to default');
  }

  async notifyRenewal(id: string) {
    const shop: any = await this.shop.findByPk(id);
    if (!shop) throw new AppError('Shop not found', 404);
    if (!shop.owner_id) throw new AppError('This shop has no owner to notify', 400);

    const sub: any = await this.activeSubFor(shop.id);
    const message = sub
      ? `Your ${sub.plan ? sub.plan.name : 'platform'} subscription for ${shop.name} expires on ${sub.end_date}. Renew soon to avoid disruption.`
      : `Your platform subscription for ${shop.name} has expired. Renew now to keep your gym running.`;

    await this.notificationService.createNotification({
      userId: shop.owner_id,
      shopId: shop.id,
      type: 'subscription_expiry',
      title: 'Renew Your Platform Subscription',
      message,
      relatedId: sub ? sub.id : null,
    });

    return new ApiPayload(null, 'Reminder sent to owner');
  }

  async listPlans() {
    const plans: any[] = await this.shopSubscriptionPlan.findAll({ order: [['sell_price', 'ASC']] });
    const counts: any[] = await this.shopSubscription.findAll({
      attributes: ['plan_id', [fn('COUNT', col('id')), 'count']],
      group: ['plan_id'],
      raw: true,
    });
    const countMap: any = Object.fromEntries(counts.map((c) => [c.plan_id, Number(c.count)]));
    return plans.map((p) => ({ ...p.toJSON(), subscriptionCount: countMap[p.id] || 0 }));
  }

  async createPlan(body: any) {
    const { name, planType, durationDays, basePrice, discount, sellPrice, description, isActive } = body;
    if (!name || !planType || !durationDays || basePrice == null || sellPrice == null) {
      throw new AppError('name, planType, durationDays, basePrice and sellPrice are required', 400);
    }
    const plan = await this.shopSubscriptionPlan.create({
      name,
      plan_type: planType,
      duration_days: durationDays,
      base_price: basePrice,
      discount: discount || 0,
      sell_price: sellPrice,
      description: description || null,
      is_active: isActive !== false,
    } as any);
    return new ApiPayload(plan, 'Plan created');
  }

  async updatePlan(id: string, body: any) {
    const plan: any = await this.shopSubscriptionPlan.findByPk(id);
    if (!plan) throw new AppError('Plan not found', 404);

    const { name, planType, durationDays, basePrice, discount, sellPrice, description, isActive } = body;
    await plan.update({
      name: name ?? plan.name,
      plan_type: planType ?? plan.plan_type,
      duration_days: durationDays ?? plan.duration_days,
      base_price: basePrice ?? plan.base_price,
      discount: discount ?? plan.discount,
      sell_price: sellPrice ?? plan.sell_price,
      description: description ?? plan.description,
      is_active: isActive ?? plan.is_active,
    });
    return new ApiPayload(plan, 'Plan updated');
  }

  async deletePlan(id: string) {
    const plan: any = await this.shopSubscriptionPlan.findByPk(id);
    if (!plan) throw new AppError('Plan not found', 404);

    const inUse = await this.shopSubscription.count({ where: { plan_id: plan.id } });
    if (inUse > 0) {
      await plan.update({ is_active: false });
      return new ApiPayload(null, 'Plan is in use — deactivated instead of deleted');
    }
    await plan.destroy();
    return new ApiPayload(null, 'Plan deleted');
  }

  async listSubscriptions() {
    const subs: any[] = await this.shopSubscription.findAll({
      include: [
        { model: Shop, as: 'shop', attributes: ['id', 'name'] },
        { model: ShopSubscriptionPlan, as: 'plan', attributes: ['name', 'plan_type'] },
      ],
      order: [['created_at', 'DESC']],
      limit: 200,
    });
    return subs.map((s) => ({
      id: s.id,
      shop: s.shop ? { id: s.shop.id, name: s.shop.name } : null,
      planName: s.plan ? s.plan.name : null,
      status: s.status,
      startDate: s.start_date,
      endDate: s.end_date,
      sellPrice: Number(s.sell_price),
      paymentId: s.razorpay_payment_id,
      createdAt: s.createdAt,
    }));
  }

  async changePassword(userId: string, body: any) {
    const { currentPassword, newPassword } = body;
    if (!newPassword || String(newPassword).length < 6) {
      throw new AppError('New password must be at least 6 characters', 400);
    }
    const user: any = await this.user.scope('withPassword').findByPk(userId);
    const valid = await this.auth.compare(currentPassword, user.password_hash);
    if (!valid) throw new AppError('Current password incorrect', 400);
    await user.update({ password_hash: await this.auth.hash(newPassword) });
    return new ApiPayload(null, 'Password changed');
  }
}
