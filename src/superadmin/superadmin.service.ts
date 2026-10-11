import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
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
import { withTransaction, iLike } from '../database/db-utils';

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
    @InjectModel(Shop.name) private readonly shop: Model<any>,
    @InjectModel(ShopSubscription.name) private readonly shopSubscription: Model<any>,
    @InjectModel(ShopSubscriptionPlan.name) private readonly shopSubscriptionPlan: Model<any>,
    @InjectModel(User.name) private readonly user: Model<any>,
    @InjectModel(Role.name) private readonly role: Model<any>,
    @InjectModel(Subscription.name) private readonly subscription: Model<any>,
    @InjectModel(Product.name) private readonly product: Model<any>,
    @InjectModel(Expense.name) private readonly expense: Model<any>,
    @InjectConnection() private readonly connection: Connection,
    private readonly auth: AuthCryptoService,
    private readonly notificationService: NotificationService,
    private readonly s3: S3Service,
    private readonly mail: MailService,
  ) {}

  private activeSubFor(shopId: string) {
    return this.shopSubscription
      .findOne({ shop_id: shopId, status: 'active', end_date: { $gte: today() } })
      .populate('plan')
      .sort({ end_date: -1 });
  }

  // COALESCE(SUM(field), 0) over the matching documents.
  private async sumOf(model: Model<any>, field: string, match: any = {}): Promise<number> {
    const [row] = await model.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: `$${field}` } } },
    ]);
    return row ? Math.round(row.total * 100) / 100 : 0;
  }

  async stats() {
    const [roles, shops, activeSubs] = await Promise.all([
      this.role.find(),
      this.shop.find().select('is_active createdAt'),
      this.shopSubscription
        .find({ status: 'active', end_date: { $gte: today() } })
        .select('shop_id'),
    ]);

    const roleId: any = Object.fromEntries(roles.map((r: any) => [r.name, r.id]));
    const activeShopIds = new Set(activeSubs.map((s: any) => s.shop_id));

    const [owners, trainers, members, totalRevenue, activeRecurringRevenue]: any = await Promise.all([
      this.user.countDocuments({ role_id: roleId.admin }),
      this.user.countDocuments({ role_id: roleId.trainer }),
      this.user.countDocuments({ role_id: roleId.member }),
      this.sumOf(this.shopSubscription, 'sell_price'),
      this.sumOf(this.shopSubscription, 'sell_price', { status: 'active', end_date: { $gte: today() } }),
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
      totalRevenue,
      activeRecurringRevenue,
    };
  }

  async listShops(query: any) {
    const { search, status } = query;
    const where: any = {};
    if (search) {
      where.$or = [{ name: iLike(search) }, { email: iLike(search) }];
    }

    const shops: any[] = await this.shop
      .find(where)
      .populate({ path: 'owner', select: 'first_name last_name email phone status' })
      .sort({ createdAt: -1 });

    const memberRole: any = await this.role.findOne({ name: 'member' });

    const data = await Promise.all(shops.map(async (shop: any) => {
      const sub: any = await this.activeSubFor(shop.id);
      const memberCount = await this.user.countDocuments({ shop_id: shop.id, role_id: memberRole.id });
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
    // userId is unused for the 'admin' role (owner avatars live under a
    // shared owner/profiles/ folder, not a per-user one).
    const key = this.s3.buildProfilePictureKey(null, '', 'admin', contentType);
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
    if (profilePicKey && !String(profilePicKey).startsWith('platform/owner/profiles/avatar_')) {
      throw new AppError('Invalid profile picture key', 400);
    }

    const tempPassword = generateTempPassword();
    const password_hash = await this.auth.hash(tempPassword);

    const { owner, shop }: any = await withTransaction(this.connection, async (session) => {
      const existing = await this.user.findOne({ email: ownerEmail }).session(session);
      if (existing) throw new AppError('An account with this email already exists', 409);

      const adminRole = await this.role.findOne({ name: 'admin' }).session(session);
      if (!adminRole) throw new AppError('Admin role not configured', 500);

      const owner: any = await new this.user({
        role_id: adminRole.id,
        first_name: ownerFirstName,
        last_name: ownerLastName,
        email: ownerEmail,
        password_hash,
        phone: ownerPhone || null,
        profile_pic: profilePicKey || null,
        status: 'active',
      }).save({ session });

      const shop: any = await new this.shop({
        name: shopName,
        owner_id: owner.id,
        phone: ownerPhone || null,
        email: ownerEmail,
        is_active: false,
      }).save({ session });

      await owner.set({ shop_id: shop.id }).save({ session });
      return { owner, shop };
    });

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
  }

  async shopDetail(id: string) {
    const shop: any = await this.shop
      .findById(id)
      .populate({ path: 'owner', select: 'first_name last_name email phone status createdAt' });
    if (!shop) throw new AppError('Shop not found', 404);

    const roles = await this.role.find();
    const roleId: any = Object.fromEntries(roles.map((r: any) => [r.name, r.id]));

    const [subHistory, trainers, members, productCount, shopRevenue, shopExpenses]: any = await Promise.all([
      this.shopSubscription
        .find({ shop_id: shop.id })
        .populate({ path: 'plan', select: 'name plan_type -_id' })
        .sort({ createdAt: -1 }),
      this.user.countDocuments({ shop_id: shop.id, role_id: roleId.trainer }),
      this.user.countDocuments({ shop_id: shop.id, role_id: roleId.member }),
      this.product.countDocuments({ shop_id: shop.id }),
      this.sumOf(this.subscription, 'sell_price', { shop_id: shop.id }),
      this.sumOf(this.expense, 'amount', { shop_id: shop.id }),
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
      shopRevenue,
      shopExpenses,
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
    return withTransaction(this.connection, async (session) => {
      const { planId, days } = body;
      const shop: any = await this.shop.findById(id).session(session);
      if (!shop) throw new AppError('Shop not found', 404);

      const plan: any = await this.shopSubscriptionPlan.findById(planId).session(session);
      if (!plan) throw new AppError('Invalid plan', 400);

      const duration = Number(days) > 0 ? Number(days) : plan.duration_days;

      const current: any = await this.shopSubscription
        .findOne({ shop_id: shop.id, status: 'active', end_date: { $gte: today() } })
        .sort({ end_date: -1 })
        .session(session);
      let startDate: any = new Date();
      if (current) {
        startDate = new Date(current.end_date);
        await current.set({ status: 'expired' }).save({ session });
      }
      const endDate = addDays(startDate, duration);

      const sub = await new this.shopSubscription({
        shop_id: shop.id,
        plan_id: plan.id,
        base_price: plan.base_price,
        sell_price: 0,
        status: 'active',
        start_date: iso(startDate),
        end_date: iso(endDate),
        razorpay_payment_id: 'MANUAL_GRANT',
      }).save({ session });

      await shop.set({ is_active: true }).save({ session });

      return new ApiPayload(sub, `Granted ${duration} days of ${plan.name}`);
    });
  }

  async revoke(id: string) {
    return withTransaction(this.connection, async (session) => {
      const shop: any = await this.shop.findById(id).session(session);
      if (!shop) throw new AppError('Shop not found', 404);

      await this.shopSubscription.updateMany(
        { shop_id: shop.id, status: 'active' },
        { $set: { status: 'cancelled' } },
        { session },
      );
      await shop.set({ is_active: false }).save({ session });

      return new ApiPayload(null, 'Access revoked. The gym is now blocked.');
    });
  }

  async extend(id: string, body: any) {
    const { days } = body;
    const n = Number(days);
    if (!n || n <= 0) throw new AppError('days must be a positive number', 400);

    const sub: any = await this.activeSubFor(id);
    if (!sub) throw new AppError('No active subscription to extend. Use grant instead.', 400);

    const newEnd = addDays(sub.end_date, n);
    await sub.set({ end_date: iso(newEnd) }).save();
    await this.shop.updateOne({ _id: id }, { $set: { is_active: true } });

    return new ApiPayload({ endDate: iso(newEnd) }, `Extended by ${n} days`);
  }

  async setOwnerStatus(id: string, body: any) {
    const { status } = body;
    if (!['active', 'suspended'].includes(status)) throw new AppError('Invalid status', 400);

    const shop: any = await this.shop.findById(id);
    if (!shop) throw new AppError('Shop not found', 404);

    await this.user.updateOne({ _id: shop.owner_id }, { $set: { status } }, { runValidators: true });
    return new ApiPayload(null, `Owner account ${status}`);
  }

  async setShopTheme(id: string, body: any) {
    const { themeColor } = body;
    if (themeColor !== null && themeColor !== undefined && themeColor !== '') {
      if (!/^#[0-9A-Fa-f]{6}$/.test(themeColor)) {
        throw new AppError('themeColor must be a hex color like #D7FF45', 400);
      }
    }

    const shop: any = await this.shop.findById(id);
    if (!shop) throw new AppError('Shop not found', 404);

    const normalized = themeColor ? themeColor : null;
    await shop.set({ theme_color: normalized }).save();
    return new ApiPayload({ themeColor: normalized }, normalized ? 'Theme color updated' : 'Theme color reset to default');
  }

  async notifyRenewal(id: string) {
    const shop: any = await this.shop.findById(id);
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
    const plans: any[] = await this.shopSubscriptionPlan.find().sort({ sell_price: 1 });
    const counts: any[] = await this.shopSubscription.aggregate([
      { $group: { _id: '$plan_id', count: { $sum: 1 } } },
    ]);
    const countMap: any = Object.fromEntries(counts.map((c) => [c._id, Number(c.count)]));
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
    });
    return new ApiPayload(plan, 'Plan created');
  }

  async updatePlan(id: string, body: any) {
    const plan: any = await this.shopSubscriptionPlan.findById(id);
    if (!plan) throw new AppError('Plan not found', 404);

    const { name, planType, durationDays, basePrice, discount, sellPrice, description, isActive } = body;
    await plan.set({
      name: name ?? plan.name,
      plan_type: planType ?? plan.plan_type,
      duration_days: durationDays ?? plan.duration_days,
      base_price: basePrice ?? plan.base_price,
      discount: discount ?? plan.discount,
      sell_price: sellPrice ?? plan.sell_price,
      description: description ?? plan.description,
      is_active: isActive ?? plan.is_active,
    }).save();
    return new ApiPayload(plan, 'Plan updated');
  }

  async deletePlan(id: string) {
    const plan: any = await this.shopSubscriptionPlan.findById(id);
    if (!plan) throw new AppError('Plan not found', 404);

    const inUse = await this.shopSubscription.countDocuments({ plan_id: plan.id });
    if (inUse > 0) {
      await plan.set({ is_active: false }).save();
      return new ApiPayload(null, 'Plan is in use — deactivated instead of deleted');
    }
    await plan.deleteOne();
    return new ApiPayload(null, 'Plan deleted');
  }

  async listSubscriptions() {
    const subs: any[] = await this.shopSubscription
      .find()
      .populate([
        { path: 'shop', select: 'name' },
        { path: 'plan', select: 'name plan_type -_id' },
      ])
      .sort({ createdAt: -1 })
      .limit(200);
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
    const user: any = await this.user.findById(userId).select('+password_hash');
    const valid = await this.auth.compare(currentPassword, user.password_hash);
    if (!valid) throw new AppError('Current password incorrect', 400);
    await user.set({ password_hash: await this.auth.hash(newPassword) }).save();
    return new ApiPayload(null, 'Password changed');
  }
}
