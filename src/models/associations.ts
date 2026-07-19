import { Role } from './role.model';
import { User } from './user.model';
import { Shop } from './shop.model';
import { ShopSubscriptionPlan } from './shop-subscription-plan.model';
import { ShopSubscription } from './shop-subscription.model';
import { SubscriptionPlan } from './subscription-plan.model';
import { Subscription } from './subscription.model';
import { Payment } from './payment.model';
import { Attendance } from './attendance.model';
import { TrainerMember } from './trainer-member.model';
import { WorkoutPlan } from './workout-plan.model';
import { WorkoutDay } from './workout-day.model';
import { WorkoutExercise } from './workout-exercise.model';
import { DietPlan } from './diet-plan.model';
import { DietMeal } from './diet-meal.model';
import { Product } from './product.model';
import { ProductSale } from './product-sale.model';
import { ExpenseCategory } from './expense-category.model';
import { Expense } from './expense.model';
import { Ledger } from './ledger.model';
import { Notification } from './notification.model';
import { TrainerAbsence } from './trainer-absence.model';
import { Referral } from './referral.model';

let done = false;

// Mirrors backend/models/index.js verbatim. Wired once at bootstrap because the
// controllers rely on these exact include aliases.
export function setupAssociations(): void {
  if (done) return;
  done = true;

  // Role <-> User
  Role.hasMany(User, { foreignKey: 'role_id' });
  User.belongsTo(Role, { foreignKey: 'role_id' });

  // Shop <-> owner (User) and tenant membership
  Shop.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
  User.hasOne(Shop, { foreignKey: 'owner_id', as: 'ownedShop' });
  Shop.hasMany(User, { foreignKey: 'shop_id', as: 'members' });
  User.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });

  // ShopSubscriptionPlan <-> ShopSubscription
  ShopSubscriptionPlan.hasMany(ShopSubscription, { foreignKey: 'plan_id' });
  ShopSubscription.belongsTo(ShopSubscriptionPlan, { foreignKey: 'plan_id', as: 'plan' });

  // Shop <-> ShopSubscription
  Shop.hasMany(ShopSubscription, { foreignKey: 'shop_id', as: 'subscriptions' });
  ShopSubscription.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });

  // User (member) <-> Subscription
  User.hasMany(Subscription, { foreignKey: 'member_id', as: 'subscriptions' });
  Subscription.belongsTo(User, { foreignKey: 'member_id', as: 'member' });

  // SubscriptionPlan <-> Subscription
  SubscriptionPlan.hasMany(Subscription, { foreignKey: 'plan_id' });
  Subscription.belongsTo(SubscriptionPlan, { foreignKey: 'plan_id', as: 'plan' });

  // Payment
  User.hasMany(Payment, { foreignKey: 'member_id', as: 'payments' });
  Payment.belongsTo(User, { foreignKey: 'member_id', as: 'member' });
  Subscription.hasMany(Payment, { foreignKey: 'subscription_id' });
  Payment.belongsTo(Subscription, { foreignKey: 'subscription_id' });
  ProductSale.hasMany(Payment, { foreignKey: 'product_sale_id' });
  Payment.belongsTo(ProductSale, { foreignKey: 'product_sale_id' });

  // Attendance
  User.hasMany(Attendance, { foreignKey: 'member_id', as: 'attendances' });
  Attendance.belongsTo(User, { foreignKey: 'member_id', as: 'member' });

  // TrainerMember
  User.hasMany(TrainerMember, { foreignKey: 'trainer_id', as: 'trainerAssignments' });
  User.hasMany(TrainerMember, { foreignKey: 'member_id', as: 'memberAssignments' });
  TrainerMember.belongsTo(User, { foreignKey: 'trainer_id', as: 'trainer' });
  TrainerMember.belongsTo(User, { foreignKey: 'member_id', as: 'member' });

  // WorkoutPlan
  User.hasMany(WorkoutPlan, { foreignKey: 'trainer_id', as: 'createdWorkoutPlans' });
  User.hasMany(WorkoutPlan, { foreignKey: 'member_id', as: 'workoutPlans' });
  WorkoutPlan.belongsTo(User, { foreignKey: 'trainer_id', as: 'trainer' });
  WorkoutPlan.belongsTo(User, { foreignKey: 'member_id', as: 'member' });
  WorkoutPlan.hasMany(WorkoutDay, { foreignKey: 'workout_plan_id', as: 'days', onDelete: 'CASCADE' });
  WorkoutDay.belongsTo(WorkoutPlan, { foreignKey: 'workout_plan_id' });
  WorkoutDay.hasMany(WorkoutExercise, { foreignKey: 'workout_day_id', as: 'exercises', onDelete: 'CASCADE' });
  WorkoutExercise.belongsTo(WorkoutDay, { foreignKey: 'workout_day_id' });

  // DietPlan
  User.hasMany(DietPlan, { foreignKey: 'trainer_id', as: 'createdDietPlans' });
  User.hasMany(DietPlan, { foreignKey: 'member_id', as: 'dietPlans' });
  DietPlan.belongsTo(User, { foreignKey: 'trainer_id', as: 'trainer' });
  DietPlan.belongsTo(User, { foreignKey: 'member_id', as: 'member' });
  DietPlan.hasMany(DietMeal, { foreignKey: 'diet_plan_id', as: 'meals', onDelete: 'CASCADE' });
  DietMeal.belongsTo(DietPlan, { foreignKey: 'diet_plan_id' });

  // Product <-> ProductSale
  Product.hasMany(ProductSale, { foreignKey: 'product_id', as: 'sales' });
  ProductSale.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
  User.hasMany(ProductSale, { foreignKey: 'member_id', as: 'productPurchases' });
  ProductSale.belongsTo(User, { foreignKey: 'member_id', as: 'buyer' });

  // ExpenseCategory <-> Expense
  ExpenseCategory.hasMany(Expense, { foreignKey: 'category_id', as: 'expenses' });
  Expense.belongsTo(ExpenseCategory, { foreignKey: 'category_id', as: 'category' });
  User.hasMany(Expense, { foreignKey: 'trainer_id', as: 'salaryExpenses' });
  Expense.belongsTo(User, { foreignKey: 'trainer_id', as: 'trainer' });

  // ProductSale <-> Expense (auto-mirrored "Product Sell" transaction row)
  ProductSale.hasMany(Expense, { foreignKey: 'product_sale_id', as: 'mirrorExpenses' });
  Expense.belongsTo(ProductSale, { foreignKey: 'product_sale_id', as: 'productSale' });

  // Notification
  User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
  Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // TrainerAbsence
  User.hasMany(TrainerAbsence, { foreignKey: 'trainer_id', as: 'absences' });
  TrainerAbsence.belongsTo(User, { foreignKey: 'trainer_id', as: 'trainer' });

  // Referral — a shop refers other shops (as referrer), and is referred by
  // at most one shop (as referred, via referred_by_shop_id on Shop itself).
  Shop.belongsTo(Shop, { foreignKey: 'referred_by_shop_id', as: 'referredByShop' });
  Shop.hasMany(Referral, { foreignKey: 'referrer_shop_id', as: 'referralsGiven' });
  Shop.hasOne(Referral, { foreignKey: 'referred_shop_id', as: 'referralReceived' });
  Referral.belongsTo(Shop, { foreignKey: 'referrer_shop_id', as: 'referrerShop' });
  Referral.belongsTo(Shop, { foreignKey: 'referred_shop_id', as: 'referredShop' });

  // Tenant (Shop) back-references for shop-scoped models
  [Subscription, Payment, Attendance, TrainerMember, WorkoutPlan, DietPlan,
    Product, ProductSale, SubscriptionPlan, Expense, ExpenseCategory, Ledger,
    Notification, TrainerAbsence].forEach((M: any) => {
    M.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });
  });
}
