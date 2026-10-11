import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import { User, Role, Subscription, SubscriptionPlan } from '../../models';
import { AuthCryptoService } from '../../common/auth-crypto.service';
import { NotificationService } from '../../shared/notification.service';
import { S3Service } from '../../shared/s3.service';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';
import { iLike } from '../../database/db-utils';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly user: Model<any>,
    @InjectModel(Role.name) private readonly role: Model<any>,
    @InjectModel(Subscription.name) private readonly subscription: Model<any>,
    @InjectModel(SubscriptionPlan.name) private readonly subscriptionPlan: Model<any>,
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
    // The Role join was an inner join: filter by the matching role ids.
    const roles: any[] = await this.role.find(role ? { name: role } : {}).select('_id');
    where.role_id = { $in: roles.map((r) => r.id) };
    if (status) where.status = status;
    if (search) {
      where.$or = [
        { first_name: iLike(search) },
        { last_name: iLike(search) },
        { email: iLike(search) },
      ];
    }
    const offset = (page - 1) * limit;
    const [count, rows] = await Promise.all([
      this.user.countDocuments(where),
      this.user
        .find(where)
        .populate([
          { path: 'Role', select: 'name -_id' },
          {
            path: 'subscriptions',
            match: { status: 'active' },
            populate: { path: 'plan', select: 'name duration -_id' },
          },
        ])
        .sort({ createdAt: -1 })
        .skip(parseInt(String(offset), 10))
        .limit(parseInt(limit)),
    ]);
    await Promise.all(rows.map((u: any) => this.withProfilePicUrl(u)));
    return new ApiPayload(rows, 'Users fetched', { total: count, page: +page, limit: +limit });
  }

  async create(shopId: string, body: any) {
    const { role, firstName, lastName, email, password, phone, dateOfBirth, gender,
      hireDate, salary, specialization, bio, emergencyContact, govtIdUrl } = body;

    if (!['trainer', 'member'].includes(role)) throw new AppError('Role must be trainer or member', 400);
    const roleRecord: any = await this.role.findOne({ name: role });
    if (!roleRecord) throw new AppError('Invalid role', 400);

    const existing = await this.user.findOne({ email });
    if (existing) throw new AppError('Email already in use', 409);

    const password_hash = await this.auth.hash(password || randomBytes(24).toString('base64'));
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
    });

    const result = await this.withRole(user.id);
    return new ApiPayload(result, 'User created');
  }

  private withRole(id: string) {
    return this.user.findById(id).populate({ path: 'Role', select: 'name -_id' });
  }

  async get(shopId: string, id: string) {
    const user = await this.user
      .findOne({ _id: id, shop_id: shopId })
      .populate([
        { path: 'Role', select: 'name -_id' },
        {
          path: 'subscriptions',
          options: { sort: { createdAt: -1 }, perDocumentLimit: 5 },
          populate: { path: 'plan' },
        },
      ]);
    if (!user) throw new AppError('User not found', 404);
    return this.withProfilePicUrl(user);
  }

  async update(shopId: string, id: string, body: any) {
    const user: any = await this.user.findOne({ _id: id, shop_id: shopId });
    if (!user) throw new AppError('User not found', 404);
    const { firstName, lastName, phone, dateOfBirth, gender, hireDate, salary,
      specialization, bio, emergencyContact, govtIdUrl } = body;
    await user.set({
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
    }).save();
    const result = await this.withRole(user.id);
    return new ApiPayload(result, 'User updated');
  }

  async remove(shopId: string, id: string) {
    const user: any = await this.user.findOne({ _id: id, shop_id: shopId });
    if (!user) throw new AppError('User not found', 404);
    await user.set({ status: 'inactive' }).save();
    return new ApiPayload(null, 'User deactivated');
  }

  async setStatus(shopId: string, id: string, body: any) {
    const user: any = await this.user.findOne({ _id: id, shop_id: shopId });
    if (!user) throw new AppError('User not found', 404);
    const { status } = body;
    if (!['active', 'inactive', 'suspended'].includes(status)) throw new AppError('Invalid status', 400);
    await user.set({ status }).save();
    return new ApiPayload(null, `User ${status}`);
  }

  // Trainers are also members — the only way to become one is an existing
  // member being promoted by the owner, never a standalone signup.
  async promoteToTrainer(shopId: string, id: string, body: any) {
    const user: any = await this.user
      .findOne({ _id: id, shop_id: shopId })
      .populate({ path: 'Role', select: 'name -_id' });
    if (!user) throw new AppError('User not found', 404);
    if (user.Role.name !== 'member') {
      throw new AppError('Only members can be promoted to trainer', 400);
    }

    const trainerRole: any = await this.role.findOne({ name: 'trainer' });
    if (!trainerRole) throw new AppError('Trainer role not configured', 500);

    const { specialization, salary, hireDate } = body;
    await user.set({
      role_id: trainerRole.id,
      specialization: specialization !== undefined ? specialization : user.specialization,
      salary: salary !== undefined ? salary : user.salary,
      hire_date: hireDate !== undefined ? hireDate : user.hire_date,
    }).save();

    await this.notificationService.createNotification({
      userId: user.id,
      shopId,
      type: 'role_promotion',
      title: 'You are now a trainer!',
      message: 'The gym owner has promoted you to trainer. You still have full access to all member features.',
    });

    const result = await this.withRole(user.id);
    return new ApiPayload(result, 'Member promoted to trainer');
  }

  async notifyRenewal(shopId: string, id: string) {
    const user: any = await this.user.findOne({ _id: id, shop_id: shopId });
    if (!user) throw new AppError('User not found', 404);

    const latestSub: any = await this.subscription
      .findOne({ member_id: user.id, shop_id: shopId })
      .populate({ path: 'plan', select: 'name -_id' })
      .sort({ end_date: -1 });

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
