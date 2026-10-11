import { belongsTo, hasMany, hasOne } from './schema-helpers';
import { RoleSchema } from './role.model';
import { UserSchema } from './user.model';
import { ShopSchema } from './shop.model';
import { ShopSubscriptionPlanSchema } from './shop-subscription-plan.model';
import { ShopSubscriptionSchema } from './shop-subscription.model';
import { SubscriptionPlanSchema } from './subscription-plan.model';
import { SubscriptionSchema } from './subscription.model';
import { PaymentSchema } from './payment.model';
import { AttendanceSchema } from './attendance.model';
import { TrainerMemberSchema } from './trainer-member.model';
import { WorkoutPlanSchema } from './workout-plan.model';
import { WorkoutDaySchema } from './workout-day.model';
import { WorkoutExerciseSchema } from './workout-exercise.model';
import { DietPlanSchema } from './diet-plan.model';
import { DietMealSchema } from './diet-meal.model';
import { ProductSchema } from './product.model';
import { ProductSaleSchema } from './product-sale.model';
import { ExpenseCategorySchema } from './expense-category.model';
import { ExpenseSchema } from './expense.model';
import { LedgerSchema } from './ledger.model';
import { NotificationSchema } from './notification.model';
import { TrainerAbsenceSchema } from './trainer-absence.model';
import { ReferralSchema } from './referral.model';
import { UserDocumentSchema } from './user-document.model';
import { DocumentAccessLogSchema } from './document-access-log.model';

// Mirrors the old Sequelize associations. Each one is a virtual populate
// named exactly like the old include alias (e.g. `.populate('Role')`,
// `.populate('plan')`), so the nested keys in JSON responses are unchanged.
// Must run before the schemas are compiled into models — models/index.ts
// imports this file for that side effect.

// Role <-> User
hasMany(RoleSchema, 'Users', 'User', 'role_id');
belongsTo(UserSchema, 'Role', 'Role', 'role_id');

// Shop <-> owner (User) and tenant membership
belongsTo(ShopSchema, 'owner', 'User', 'owner_id');
hasOne(UserSchema, 'ownedShop', 'Shop', 'owner_id');
hasMany(ShopSchema, 'members', 'User', 'shop_id');
belongsTo(UserSchema, 'shop', 'Shop', 'shop_id');

// ShopSubscriptionPlan <-> ShopSubscription
hasMany(ShopSubscriptionPlanSchema, 'ShopSubscriptions', 'ShopSubscription', 'plan_id');
belongsTo(ShopSubscriptionSchema, 'plan', 'ShopSubscriptionPlan', 'plan_id');

// Shop <-> ShopSubscription
hasMany(ShopSchema, 'subscriptions', 'ShopSubscription', 'shop_id');
belongsTo(ShopSubscriptionSchema, 'shop', 'Shop', 'shop_id');

// User (member) <-> Subscription
hasMany(UserSchema, 'subscriptions', 'Subscription', 'member_id');
belongsTo(SubscriptionSchema, 'member', 'User', 'member_id');

// SubscriptionPlan <-> Subscription
hasMany(SubscriptionPlanSchema, 'Subscriptions', 'Subscription', 'plan_id');
belongsTo(SubscriptionSchema, 'plan', 'SubscriptionPlan', 'plan_id');

// Payment
hasMany(UserSchema, 'payments', 'Payment', 'member_id');
belongsTo(PaymentSchema, 'member', 'User', 'member_id');
hasMany(SubscriptionSchema, 'Payments', 'Payment', 'subscription_id');
belongsTo(PaymentSchema, 'Subscription', 'Subscription', 'subscription_id');
hasMany(ProductSaleSchema, 'Payments', 'Payment', 'product_sale_id');
belongsTo(PaymentSchema, 'ProductSale', 'ProductSale', 'product_sale_id');

// Attendance
hasMany(UserSchema, 'attendances', 'Attendance', 'member_id');
belongsTo(AttendanceSchema, 'member', 'User', 'member_id');

// TrainerMember
hasMany(UserSchema, 'trainerAssignments', 'TrainerMember', 'trainer_id');
hasMany(UserSchema, 'memberAssignments', 'TrainerMember', 'member_id');
belongsTo(TrainerMemberSchema, 'trainer', 'User', 'trainer_id');
belongsTo(TrainerMemberSchema, 'member', 'User', 'member_id');

// WorkoutPlan
hasMany(UserSchema, 'createdWorkoutPlans', 'WorkoutPlan', 'trainer_id');
hasMany(UserSchema, 'workoutPlans', 'WorkoutPlan', 'member_id');
belongsTo(WorkoutPlanSchema, 'trainer', 'User', 'trainer_id');
belongsTo(WorkoutPlanSchema, 'member', 'User', 'member_id');
hasMany(WorkoutPlanSchema, 'days', 'WorkoutDay', 'workout_plan_id');
belongsTo(WorkoutDaySchema, 'WorkoutPlan', 'WorkoutPlan', 'workout_plan_id');
hasMany(WorkoutDaySchema, 'exercises', 'WorkoutExercise', 'workout_day_id');
belongsTo(WorkoutExerciseSchema, 'WorkoutDay', 'WorkoutDay', 'workout_day_id');

// DietPlan
hasMany(UserSchema, 'createdDietPlans', 'DietPlan', 'trainer_id');
hasMany(UserSchema, 'dietPlans', 'DietPlan', 'member_id');
belongsTo(DietPlanSchema, 'trainer', 'User', 'trainer_id');
belongsTo(DietPlanSchema, 'member', 'User', 'member_id');
hasMany(DietPlanSchema, 'meals', 'DietMeal', 'diet_plan_id');
belongsTo(DietMealSchema, 'DietPlan', 'DietPlan', 'diet_plan_id');

// Product <-> ProductSale
hasMany(ProductSchema, 'sales', 'ProductSale', 'product_id');
belongsTo(ProductSaleSchema, 'product', 'Product', 'product_id');
hasMany(UserSchema, 'productPurchases', 'ProductSale', 'member_id');
belongsTo(ProductSaleSchema, 'buyer', 'User', 'member_id');

// ExpenseCategory <-> Expense
hasMany(ExpenseCategorySchema, 'expenses', 'Expense', 'category_id');
belongsTo(ExpenseSchema, 'category', 'ExpenseCategory', 'category_id');
hasMany(UserSchema, 'salaryExpenses', 'Expense', 'trainer_id');
belongsTo(ExpenseSchema, 'trainer', 'User', 'trainer_id');

// ProductSale <-> Expense (auto-mirrored "Product Sell" transaction row)
hasMany(ProductSaleSchema, 'mirrorExpenses', 'Expense', 'product_sale_id');
belongsTo(ExpenseSchema, 'productSale', 'ProductSale', 'product_sale_id');

// Notification
hasMany(UserSchema, 'notifications', 'Notification', 'user_id');
belongsTo(NotificationSchema, 'user', 'User', 'user_id');

// TrainerAbsence
hasMany(UserSchema, 'absences', 'TrainerAbsence', 'trainer_id');
belongsTo(TrainerAbsenceSchema, 'trainer', 'User', 'trainer_id');

// Referral — a shop refers other shops (as referrer), and is referred by
// at most one shop (as referred, via referred_by_shop_id on Shop itself).
belongsTo(ShopSchema, 'referredByShop', 'Shop', 'referred_by_shop_id');
hasMany(ShopSchema, 'referralsGiven', 'Referral', 'referrer_shop_id');
hasOne(ShopSchema, 'referralReceived', 'Referral', 'referred_shop_id');
belongsTo(ReferralSchema, 'referrerShop', 'Shop', 'referrer_shop_id');
belongsTo(ReferralSchema, 'referredShop', 'Shop', 'referred_shop_id');

// UserDocument — a member/trainer's uploaded ID, reviewed by the shop owner.
hasMany(UserSchema, 'documents', 'UserDocument', 'user_id');
belongsTo(UserDocumentSchema, 'user', 'User', 'user_id');
belongsTo(UserDocumentSchema, 'reviewer', 'User', 'reviewed_by');

// DocumentAccessLog — audit trail of admin views of an original document.
hasMany(UserDocumentSchema, 'accessLogs', 'DocumentAccessLog', 'document_id');
belongsTo(DocumentAccessLogSchema, 'document', 'UserDocument', 'document_id');
belongsTo(DocumentAccessLogSchema, 'viewer', 'User', 'viewed_by');

// Tenant (Shop) back-references for shop-scoped models
[SubscriptionSchema, PaymentSchema, AttendanceSchema, TrainerMemberSchema, WorkoutPlanSchema,
  DietPlanSchema, ProductSchema, ProductSaleSchema, SubscriptionPlanSchema, ExpenseSchema,
  ExpenseCategorySchema, LedgerSchema, NotificationSchema, TrainerAbsenceSchema, UserDocumentSchema,
  DocumentAccessLogSchema].forEach((schema) => belongsTo(schema, 'shop', 'Shop', 'shop_id'));
