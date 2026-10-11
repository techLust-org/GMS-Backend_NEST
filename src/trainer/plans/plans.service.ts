import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { TrainerMember, WorkoutPlan, WorkoutDay, WorkoutExercise, DietPlan, DietMeal } from '../../models';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';
import { withTransaction } from '../../database/db-utils';

@Injectable()
export class TrainerPlansService {
  constructor(
    @InjectModel(TrainerMember.name) private readonly trainerMember: Model<any>,
    @InjectModel(WorkoutPlan.name) private readonly workoutPlan: Model<any>,
    @InjectModel(WorkoutDay.name) private readonly workoutDay: Model<any>,
    @InjectModel(WorkoutExercise.name) private readonly workoutExercise: Model<any>,
    @InjectModel(DietPlan.name) private readonly dietPlan: Model<any>,
    @InjectModel(DietMeal.name) private readonly dietMeal: Model<any>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  private async verifyAssignment(trainerId: string, memberId: string) {
    const a = await this.trainerMember.findOne({ trainer_id: trainerId, member_id: memberId, is_active: true });
    if (!a) throw new AppError('Not your assigned member', 403);
  }

  // ─── Workout Plans ───────────────────────────────────────────────────────────

  async listWorkoutPlans(trainerId: string, memberId: string) {
    await this.verifyAssignment(trainerId, memberId);
    return this.workoutPlan
      .find({ member_id: memberId })
      .populate({ path: 'days', populate: { path: 'exercises' } })
      .sort({ createdAt: -1 });
  }

  async createWorkoutPlan(trainerId: string, shopId: string, memberId: string, body: any) {
    await this.verifyAssignment(trainerId, memberId);
    const { title, description, goal, start_date, end_date } = body;
    if (!title) throw new AppError('Title required', 400);
    const plan = await this.workoutPlan.create({
      shop_id: shopId,
      trainer_id: trainerId, member_id: memberId,
      title, description, goal,
      start_date, end_date,
    });
    return new ApiPayload(plan, 'Workout plan created');
  }

  async getWorkoutPlan(trainerId: string, memberId: string, planId: string) {
    await this.verifyAssignment(trainerId, memberId);
    const plan = await this.workoutPlan
      .findOne({ _id: planId, member_id: memberId })
      .populate({
        path: 'days',
        populate: { path: 'exercises', options: { sort: { order_index: 1 } } },
      });
    if (!plan) throw new AppError('Plan not found', 404);
    return plan;
  }

  async updateWorkoutPlan(trainerId: string, memberId: string, planId: string, body: any) {
    await this.verifyAssignment(trainerId, memberId);
    const plan: any = await this.workoutPlan.findOne({ _id: planId, member_id: memberId });
    if (!plan) throw new AppError('Plan not found', 404);
    await plan.set(body).save();
    return new ApiPayload(plan, 'Updated');
  }

  async deleteWorkoutPlan(trainerId: string, memberId: string, planId: string) {
    await this.verifyAssignment(trainerId, memberId);
    const plan: any = await this.workoutPlan.findOne({ _id: planId, member_id: memberId });
    if (!plan) throw new AppError('Plan not found', 404);
    // Days and their exercises went with the plan via ON DELETE CASCADE.
    await withTransaction(this.connection, async (session) => {
      const dayIds = (await this.workoutDay.find({ workout_plan_id: plan.id }).select('_id').session(session))
        .map((d: any) => d.id);
      await this.workoutExercise.deleteMany({ workout_day_id: { $in: dayIds } }, { session });
      await this.workoutDay.deleteMany({ workout_plan_id: plan.id }, { session });
      await plan.deleteOne({ session });
    });
    return new ApiPayload(null, 'Deleted');
  }

  async addWorkoutDay(trainerId: string, memberId: string, planId: string, body: any) {
    await this.verifyAssignment(trainerId, memberId);
    const { day_of_week, notes } = body;
    const day = await this.workoutDay.create({ workout_plan_id: planId, day_of_week, notes });
    return new ApiPayload(day, 'Day added');
  }

  async updateWorkoutDay(trainerId: string, memberId: string, dayId: string, body: any) {
    await this.verifyAssignment(trainerId, memberId);
    const day: any = await this.workoutDay.findById(dayId);
    if (!day) throw new AppError('Day not found', 404);
    await day.set(body).save();
    return new ApiPayload(day, 'Day updated');
  }

  async deleteWorkoutDay(trainerId: string, memberId: string, dayId: string) {
    await this.verifyAssignment(trainerId, memberId);
    const day: any = await this.workoutDay.findById(dayId);
    if (!day) throw new AppError('Day not found', 404);
    // Exercises went with the day via ON DELETE CASCADE.
    await withTransaction(this.connection, async (session) => {
      await this.workoutExercise.deleteMany({ workout_day_id: day.id }, { session });
      await day.deleteOne({ session });
    });
    return new ApiPayload(null, 'Day deleted');
  }

  async addExercise(trainerId: string, memberId: string, dayId: string, body: any) {
    await this.verifyAssignment(trainerId, memberId);
    const { name, sets, reps, duration_secs, rest_secs, notes, order_index } = body;
    const ex = await this.workoutExercise.create({
      workout_day_id: dayId,
      name, sets, reps,
      duration_secs,
      rest_secs,
      notes,
      order_index: order_index || 0,
    });
    return new ApiPayload(ex, 'Exercise added');
  }

  async updateExercise(trainerId: string, memberId: string, exId: string, body: any) {
    await this.verifyAssignment(trainerId, memberId);
    const ex: any = await this.workoutExercise.findById(exId);
    if (!ex) throw new AppError('Exercise not found', 404);
    await ex.set(body).save();
    return new ApiPayload(ex, 'Exercise updated');
  }

  async deleteExercise(trainerId: string, memberId: string, exId: string) {
    await this.verifyAssignment(trainerId, memberId);
    const ex: any = await this.workoutExercise.findById(exId);
    if (!ex) throw new AppError('Exercise not found', 404);
    await ex.deleteOne();
    return new ApiPayload(null, 'Exercise deleted');
  }

  // ─── Diet Plans ──────────────────────────────────────────────────────────────

  async listDietPlans(trainerId: string, memberId: string) {
    await this.verifyAssignment(trainerId, memberId);
    return this.dietPlan
      .find({ member_id: memberId })
      .populate({ path: 'meals', options: { sort: { order_index: 1 } } })
      .sort({ createdAt: -1 });
  }

  async createDietPlan(trainerId: string, shopId: string, memberId: string, body: any) {
    await this.verifyAssignment(trainerId, memberId);
    const { title, description, daily_calories, protein_grams, carbs_grams, fat_grams } = body;
    if (!title) throw new AppError('Title required', 400);
    const plan = await this.dietPlan.create({
      shop_id: shopId,
      trainer_id: trainerId, member_id: memberId,
      title, description,
      daily_calories,
      protein_grams,
      carbs_grams,
      fat_grams,
    });
    return new ApiPayload(plan, 'Diet plan created');
  }

  async getDietPlan(trainerId: string, memberId: string, planId: string) {
    await this.verifyAssignment(trainerId, memberId);
    const plan = await this.dietPlan
      .findOne({ _id: planId, member_id: memberId })
      .populate({ path: 'meals', options: { sort: { order_index: 1 } } });
    if (!plan) throw new AppError('Plan not found', 404);
    return plan;
  }

  async updateDietPlan(trainerId: string, memberId: string, planId: string, body: any) {
    await this.verifyAssignment(trainerId, memberId);
    const plan: any = await this.dietPlan.findOne({ _id: planId, member_id: memberId });
    if (!plan) throw new AppError('Plan not found', 404);
    await plan.set(body).save();
    return new ApiPayload(plan, 'Updated');
  }

  async deleteDietPlan(trainerId: string, memberId: string, planId: string) {
    await this.verifyAssignment(trainerId, memberId);
    const plan: any = await this.dietPlan.findOne({ _id: planId, member_id: memberId });
    if (!plan) throw new AppError('Plan not found', 404);
    // Meals went with the plan via ON DELETE CASCADE.
    await withTransaction(this.connection, async (session) => {
      await this.dietMeal.deleteMany({ diet_plan_id: plan.id }, { session });
      await plan.deleteOne({ session });
    });
    return new ApiPayload(null, 'Deleted');
  }

  async addMeal(trainerId: string, memberId: string, planId: string, body: any) {
    await this.verifyAssignment(trainerId, memberId);
    const { meal_name, meal_time, foods, calories, order_index } = body;
    const meal = await this.dietMeal.create({
      diet_plan_id: planId,
      meal_name, meal_time, foods, calories,
      order_index: order_index || 0,
    });
    return new ApiPayload(meal, 'Meal added');
  }

  async updateMeal(trainerId: string, memberId: string, mealId: string, body: any) {
    await this.verifyAssignment(trainerId, memberId);
    const meal: any = await this.dietMeal.findById(mealId);
    if (!meal) throw new AppError('Meal not found', 404);
    await meal.set(body).save();
    return new ApiPayload(meal, 'Meal updated');
  }

  async deleteMeal(trainerId: string, memberId: string, mealId: string) {
    await this.verifyAssignment(trainerId, memberId);
    const meal: any = await this.dietMeal.findById(mealId);
    if (!meal) throw new AppError('Meal not found', 404);
    await meal.deleteOne();
    return new ApiPayload(null, 'Meal deleted');
  }
}
