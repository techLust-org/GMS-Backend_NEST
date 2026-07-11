import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { WorkoutPlan, WorkoutDay, WorkoutExercise, DietPlan, DietMeal, Payment } from '../../models';

@Injectable()
export class MemberPlansService {
  constructor(
    @InjectModel(WorkoutPlan) private readonly workoutPlan: typeof WorkoutPlan,
    @InjectModel(DietPlan) private readonly dietPlan: typeof DietPlan,
    @InjectModel(Payment) private readonly payment: typeof Payment,
  ) {}

  async activeWorkoutPlan(userId: string) {
    return this.workoutPlan.findOne({
      where: { member_id: userId, is_active: true },
      include: [{
        model: WorkoutDay, as: 'days',
        include: [{ model: WorkoutExercise, as: 'exercises', order: [['order_index', 'ASC']] }],
      }],
      order: [['created_at', 'DESC']],
    });
  }

  async activeDietPlan(userId: string) {
    return this.dietPlan.findOne({
      where: { member_id: userId, is_active: true },
      include: [{ model: DietMeal, as: 'meals', order: [['order_index', 'ASC']] }],
      order: [['created_at', 'DESC']],
    });
  }

  async payments(userId: string) {
    return this.payment.findAll({
      where: { member_id: userId },
      order: [['payment_date', 'DESC']],
    });
  }
}
