import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionPlan } from '../../models';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';

const DURATION_DAYS: Record<string, number> = { monthly: 30, quarterly: 90, yearly: 365 };

@Injectable()
export class MemberPlansService {
  constructor(@InjectModel(SubscriptionPlan.name) private readonly subscriptionPlan: Model<any>) {}

  async list(shopId: string) {
    return this.subscriptionPlan.find({ shop_id: shopId }).sort({ sell_price: 1 });
  }

  async create(shopId: string, body: any) {
    const { name, duration, durationDays, basePrice, discount = 0, sellPrice, description } = body;
    if (!name || !duration || sellPrice === undefined) {
      throw new AppError('Name, duration and sell price are required', 400);
    }
    if (!DURATION_DAYS[duration]) throw new AppError('Duration must be monthly, quarterly or yearly', 400);

    const plan = await this.subscriptionPlan.create({
      shop_id: shopId,
      name,
      duration,
      duration_days: durationDays || DURATION_DAYS[duration],
      base_price: basePrice !== undefined ? basePrice : sellPrice,
      discount,
      sell_price: sellPrice,
      description,
    });
    return new ApiPayload(plan, 'Plan created');
  }

  async update(shopId: string, id: string, body: any) {
    const plan: any = await this.subscriptionPlan.findOne({ _id: id, shop_id: shopId });
    if (!plan) throw new AppError('Plan not found', 404);
    const { name, duration, durationDays, basePrice, discount, sellPrice, description, isActive } = body;
    if (duration && !DURATION_DAYS[duration]) throw new AppError('Invalid duration', 400);
    await plan.set({
      name: name || plan.name,
      duration: duration || plan.duration,
      duration_days: durationDays || (duration ? DURATION_DAYS[duration] : plan.duration_days),
      base_price: basePrice !== undefined ? basePrice : plan.base_price,
      discount: discount !== undefined ? discount : plan.discount,
      sell_price: sellPrice !== undefined ? sellPrice : plan.sell_price,
      description: description !== undefined ? description : plan.description,
      is_active: isActive !== undefined ? isActive : plan.is_active,
    }).save();
    return new ApiPayload(plan, 'Plan updated');
  }

  async remove(shopId: string, id: string) {
    const plan: any = await this.subscriptionPlan.findOne({ _id: id, shop_id: shopId });
    if (!plan) throw new AppError('Plan not found', 404);
    await plan.set({ is_active: false }).save();
    return new ApiPayload(null, 'Plan deactivated');
  }
}
