import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkoutPlan, DietPlan, Payment } from '../../models';

@Injectable()
export class MemberPlansService {
  constructor(
    @InjectModel(WorkoutPlan.name) private readonly workoutPlan: Model<any>,
    @InjectModel(DietPlan.name) private readonly dietPlan: Model<any>,
    @InjectModel(Payment.name) private readonly payment: Model<any>,
  ) {}

  async activeWorkoutPlan(userId: string) {
    return this.workoutPlan
      .findOne({ member_id: userId, is_active: true })
      .populate({
        path: 'days',
        populate: { path: 'exercises', options: { sort: { order_index: 1 } } },
      })
      .sort({ createdAt: -1 });
  }

  async activeDietPlan(userId: string) {
    return this.dietPlan
      .findOne({ member_id: userId, is_active: true })
      .populate({ path: 'meals', options: { sort: { order_index: 1 } } })
      .sort({ createdAt: -1 });
  }

  async payments(userId: string) {
    return this.payment.find({ member_id: userId }).sort({ payment_date: -1 });
  }
}
