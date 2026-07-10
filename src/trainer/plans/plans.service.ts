import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TrainerMember, WorkoutPlan, WorkoutDay, WorkoutExercise, DietPlan, DietMeal } from '../../models';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';

@Injectable()
export class TrainerPlansService {
  constructor(
    @InjectModel(TrainerMember) private readonly trainerMember: typeof TrainerMember,
    @InjectModel(WorkoutPlan) private readonly workoutPlan: typeof WorkoutPlan,
    @InjectModel(WorkoutDay) private readonly workoutDay: typeof WorkoutDay,
    @InjectModel(WorkoutExercise) private readonly workoutExercise: typeof WorkoutExercise,
    @InjectModel(DietPlan) private readonly dietPlan: typeof DietPlan,
    @InjectModel(DietMeal) private readonly dietMeal: typeof DietMeal,
  ) {}

  private async verifyAssignment(trainerId: number, memberId: number) {
    const a = await this.trainerMember.findOne({
      where: { trainer_id: trainerId, member_id: memberId, is_active: true },
    });
    if (!a) throw new AppError('Not your assigned member', 403);
  }

  // ─── Workout Plans ───────────────────────────────────────────────────────────

  async listWorkoutPlans(trainerId: number, memberId: number) {
    await this.verifyAssignment(trainerId, memberId);
    return this.workoutPlan.findAll({
      where: { member_id: memberId },
      include: [{ model: WorkoutDay, as: 'days', include: [{ model: WorkoutExercise, as: 'exercises' }] }],
      order: [['created_at', 'DESC']],
    });
  }

  async createWorkoutPlan(trainerId: number, shopId: number, memberId: number, body: any) {
    await this.verifyAssignment(trainerId, memberId);
    const { title, description, goal, start_date, end_date } = body;
    if (!title) throw new AppError('Title required', 400);
    const plan = await this.workoutPlan.create({
      shop_id: shopId,
      trainer_id: trainerId, member_id: memberId,
      title, description, goal,
      start_date, end_date,
    } as any);
    return new ApiPayload(plan, 'Workout plan created');
  }

  async getWorkoutPlan(trainerId: number, memberId: number, planId: number) {
    await this.verifyAssignment(trainerId, memberId);
    const plan = await this.workoutPlan.findOne({
      where: { id: planId, member_id: memberId },
      include: [{
        model: WorkoutDay, as: 'days',
        include: [{ model: WorkoutExercise, as: 'exercises', order: [['order_index', 'ASC']] }],
      }],
    });
    if (!plan) throw new AppError('Plan not found', 404);
    return plan;
  }

  async updateWorkoutPlan(trainerId: number, memberId: number, planId: number, body: any) {
    await this.verifyAssignment(trainerId, memberId);
    const plan: any = await this.workoutPlan.findOne({ where: { id: planId, member_id: memberId } });
    if (!plan) throw new AppError('Plan not found', 404);
    await plan.update(body);
    return new ApiPayload(plan, 'Updated');
  }

  async deleteWorkoutPlan(trainerId: number, memberId: number, planId: number) {
    await this.verifyAssignment(trainerId, memberId);
    const plan: any = await this.workoutPlan.findOne({ where: { id: planId, member_id: memberId } });
    if (!plan) throw new AppError('Plan not found', 404);
    await plan.destroy();
    return new ApiPayload(null, 'Deleted');
  }

  async addWorkoutDay(trainerId: number, memberId: number, planId: number, body: any) {
    await this.verifyAssignment(trainerId, memberId);
    const { day_of_week, notes } = body;
    const day = await this.workoutDay.create({ workout_plan_id: planId, day_of_week, notes } as any);
    return new ApiPayload(day, 'Day added');
  }

  async updateWorkoutDay(trainerId: number, memberId: number, dayId: number, body: any) {
    await this.verifyAssignment(trainerId, memberId);
    const day: any = await this.workoutDay.findByPk(dayId);
    if (!day) throw new AppError('Day not found', 404);
    await day.update(body);
    return new ApiPayload(day, 'Day updated');
  }

  async deleteWorkoutDay(trainerId: number, memberId: number, dayId: number) {
    await this.verifyAssignment(trainerId, memberId);
    const day: any = await this.workoutDay.findByPk(dayId);
    if (!day) throw new AppError('Day not found', 404);
    await day.destroy();
    return new ApiPayload(null, 'Day deleted');
  }

  async addExercise(trainerId: number, memberId: number, dayId: number, body: any) {
    await this.verifyAssignment(trainerId, memberId);
    const { name, sets, reps, duration_secs, rest_secs, notes, order_index } = body;
    const ex = await this.workoutExercise.create({
      workout_day_id: dayId,
      name, sets, reps,
      duration_secs,
      rest_secs,
      notes,
      order_index: order_index || 0,
    } as any);
    return new ApiPayload(ex, 'Exercise added');
  }

  async updateExercise(trainerId: number, memberId: number, exId: number, body: any) {
    await this.verifyAssignment(trainerId, memberId);
    const ex: any = await this.workoutExercise.findByPk(exId);
    if (!ex) throw new AppError('Exercise not found', 404);
    await ex.update(body);
    return new ApiPayload(ex, 'Exercise updated');
  }

  async deleteExercise(trainerId: number, memberId: number, exId: number) {
    await this.verifyAssignment(trainerId, memberId);
    const ex: any = await this.workoutExercise.findByPk(exId);
    if (!ex) throw new AppError('Exercise not found', 404);
    await ex.destroy();
    return new ApiPayload(null, 'Exercise deleted');
  }

  // ─── Diet Plans ──────────────────────────────────────────────────────────────

  async listDietPlans(trainerId: number, memberId: number) {
    await this.verifyAssignment(trainerId, memberId);
    return this.dietPlan.findAll({
      where: { member_id: memberId },
      include: [{ model: DietMeal, as: 'meals', order: [['order_index', 'ASC']] }],
      order: [['created_at', 'DESC']],
    });
  }

  async createDietPlan(trainerId: number, shopId: number, memberId: number, body: any) {
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
    } as any);
    return new ApiPayload(plan, 'Diet plan created');
  }

  async getDietPlan(trainerId: number, memberId: number, planId: number) {
    await this.verifyAssignment(trainerId, memberId);
    const plan = await this.dietPlan.findOne({
      where: { id: planId, member_id: memberId },
      include: [{ model: DietMeal, as: 'meals', order: [['order_index', 'ASC']] }],
    });
    if (!plan) throw new AppError('Plan not found', 404);
    return plan;
  }

  async updateDietPlan(trainerId: number, memberId: number, planId: number, body: any) {
    await this.verifyAssignment(trainerId, memberId);
    const plan: any = await this.dietPlan.findOne({ where: { id: planId, member_id: memberId } });
    if (!plan) throw new AppError('Plan not found', 404);
    await plan.update(body);
    return new ApiPayload(plan, 'Updated');
  }

  async deleteDietPlan(trainerId: number, memberId: number, planId: number) {
    await this.verifyAssignment(trainerId, memberId);
    const plan: any = await this.dietPlan.findOne({ where: { id: planId, member_id: memberId } });
    if (!plan) throw new AppError('Plan not found', 404);
    await plan.destroy();
    return new ApiPayload(null, 'Deleted');
  }

  async addMeal(trainerId: number, memberId: number, planId: number, body: any) {
    await this.verifyAssignment(trainerId, memberId);
    const { meal_name, meal_time, foods, calories, order_index } = body;
    const meal = await this.dietMeal.create({
      diet_plan_id: planId,
      meal_name, meal_time, foods, calories,
      order_index: order_index || 0,
    } as any);
    return new ApiPayload(meal, 'Meal added');
  }

  async updateMeal(trainerId: number, memberId: number, mealId: number, body: any) {
    await this.verifyAssignment(trainerId, memberId);
    const meal: any = await this.dietMeal.findByPk(mealId);
    if (!meal) throw new AppError('Meal not found', 404);
    await meal.update(body);
    return new ApiPayload(meal, 'Meal updated');
  }

  async deleteMeal(trainerId: number, memberId: number, mealId: number) {
    await this.verifyAssignment(trainerId, memberId);
    const meal: any = await this.dietMeal.findByPk(mealId);
    if (!meal) throw new AppError('Meal not found', 404);
    await meal.destroy();
    return new ApiPayload(null, 'Meal deleted');
  }
}
