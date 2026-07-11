import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { User, Role, Subscription, SubscriptionPlan } from '../../models';
import { AuthCryptoService } from '../../common/auth-crypto.service';
import { NotificationService } from '../../shared/notification.service';
import { S3Service } from '../../shared/s3.service';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private readonly user: typeof User,
    @InjectModel(Role) private readonly role: typeof Role,
    @InjectModel(Subscription) private readonly subscription: typeof Subscription,
    @InjectModel(SubscriptionPlan) private readonly subscriptionPlan: typeof SubscriptionPlan,
    private readonly auth: AuthCryptoService,
    private readonly notificationService: NotificationService,
    private readonly s3: S3Service,
  ) {}

  // profile_pic is stored as a raw S3 object key — resolve it to a
  // short-lived signed URL right before the response goes out.
  private async withProfilePicUrl(u: any) {
    if (u?.profile_pic) u.profile_pic = await this.s3.getViewUrl(u.profile_pic);
    return u;
  }

  async list(shopId: string, query: any) {
    const { role, status, search, page = 1, limit = 20 } = query;
    const where: any = { shop_id: shopId };
    const roleWhere: any = {};
    if (role) roleWhere.name = role;
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const offset = (page - 1) * limit;
    const includes = [
      { model: Role, where: roleWhere, attributes: ['name'] },
      {
        model: Subscription,
        as: 'subscriptions',
        where: { status: 'active' },
        required: false,
        include: [{ model: SubscriptionPlan, as: 'plan', attributes: ['name', 'duration'] }],
      },
    ];
    const { count, rows } = await this.user.findAndCountAll({
      where,
      include: includes as any,
      limit: parseInt(limit),
      offset: parseInt(String(offset), 10),
      order: [['created_at', 'DESC']],
    });
    await Promise.all(rows.map((u: any) => this.withProfilePicUrl(u)));
    return new ApiPayload(rows, 'Users fetched', { total: count, page: +page, limit: +limit });
  }

  async create(shopId: string, body: any) {
    const { role, firstName, lastName, email, password, phone, dateOfBirth, gender,
      hireDate, salary, specialization, bio, emergencyContact, govtIdUrl } = body;

    if (!['trainer', 'member'].includes(role)) throw new AppError('Role must be trainer or member', 400);
    const roleRecord: any = await this.role.findOne({ where: { name: role } });
    if (!roleRecord) throw new AppError('Invalid role', 400);

    const existing = await this.user.findOne({ where: { email } });
    if (existing) throw new AppError('Email already in use', 409);

    const password_hash = await this.auth.hash(password || 'Password123!');
    const user: any = await this.user.create({
      role_id: roleRecord.id,
      shop_id: shopId,
      first_name: firstName,
      last_name: lastName,
      email,
      password_hash,
      phone,
      date_of_birth: dateOfBirth,
      gender,
      hire_date: hireDate,
      salary,
      specialization,
      bio,
      emergency_contact: emergencyContact,
      govt_id_url: govtIdUrl,
    } as any);

    const result = await this.user.findByPk(user.id, { include: [{ model: Role, attributes: ['name'] }] });
    return new ApiPayload(result, 'User created');
  }

  async get(shopId: string, id: string) {
    const user = await this.user.findOne({
      where: { id, shop_id: shopId },
      include: [
        { model: Role, attributes: ['name'] },
        {
          model: Subscription, as: 'subscriptions', limit: 5, order: [['created_at', 'DESC']],
          include: [{ model: SubscriptionPlan, as: 'plan' }],
        },
      ],
    });
    if (!user) throw new AppError('User not found', 404);
    return this.withProfilePicUrl(user);
  }

  async update(shopId: string, id: string, body: any) {
    const user: any = await this.user.findOne({ where: { id, shop_id: shopId } });
    if (!user) throw new AppError('User not found', 404);
    const { firstName, lastName, phone, dateOfBirth, gender, hireDate, salary,
      specialization, bio, emergencyContact, govtIdUrl } = body;
    await user.update({
      first_name: firstName || user.first_name,
      last_name: lastName || user.last_name,
      phone: phone !== undefined ? phone : user.phone,
      date_of_birth: dateOfBirth || user.date_of_birth,
      gender: gender || user.gender,
      hire_date: hireDate || user.hire_date,
      salary: salary !== undefined ? salary : user.salary,
      specialization: specialization !== undefined ? specialization : user.specialization,
      bio: bio !== undefined ? bio : user.bio,
      emergency_contact: emergencyContact !== undefined ? emergencyContact : user.emergency_contact,
      govt_id_url: govtIdUrl !== undefined ? govtIdUrl : user.govt_id_url,
    });
    const result = await this.user.findByPk(user.id, { include: [{ model: Role, attributes: ['name'] }] });
    return new ApiPayload(result, 'User updated');
  }

  async remove(shopId: string, id: string) {
    const user: any = await this.user.findOne({ where: { id, shop_id: shopId } });
    if (!user) throw new AppError('User not found', 404);
    await user.update({ status: 'inactive' });
    return new ApiPayload(null, 'User deactivated');
  }

  async setStatus(shopId: string, id: string, body: any) {
    const user: any = await this.user.findOne({ where: { id, shop_id: shopId } });
    if (!user) throw new AppError('User not found', 404);
    const { status } = body;
    if (!['active', 'inactive', 'suspended'].includes(status)) throw new AppError('Invalid status', 400);
    await user.update({ status });
    return new ApiPayload(null, `User ${status}`);
  }

  async notifyRenewal(shopId: string, id: string) {
    const user: any = await this.user.findOne({ where: { id, shop_id: shopId } });
    if (!user) throw new AppError('User not found', 404);

    const latestSub: any = await this.subscription.findOne({
      where: { member_id: user.id, shop_id: shopId },
      include: [{ model: SubscriptionPlan, as: 'plan', attributes: ['name'] }],
      order: [['end_date', 'DESC']],
    });

    const message = latestSub && latestSub.status === 'active'
      ? `Your ${latestSub.plan ? latestSub.plan.name : 'membership'} plan expires on ${latestSub.end_date}. Renew soon to keep your access active.`
      : 'Your gym membership plan has expired. Renew now to continue accessing the gym.';

    await this.notificationService.createNotification({
      userId: user.id,
      shopId,
      type: 'subscription_expiry',
      title: 'Renew Your Membership',
      message,
      relatedId: latestSub ? latestSub.id : null,
    });

    return new ApiPayload(null, 'Reminder sent');
  }
}
