'use strict';

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
  }
);

const Role = require('./Role')(sequelize);
const User = require('./User')(sequelize);
const Shop = require('./Shop')(sequelize);
const ShopSubscriptionPlan = require('./ShopSubscriptionPlan')(sequelize);
const ShopSubscription = require('./ShopSubscription')(sequelize);
const SubscriptionPlan = require('./SubscriptionPlan')(sequelize);
const Subscription = require('./Subscription')(sequelize);
const Payment = require('./Payment')(sequelize);
const Attendance = require('./Attendance')(sequelize);
const TrainerMember = require('./TrainerMember')(sequelize);
const WorkoutPlan = require('./WorkoutPlan')(sequelize);
const WorkoutDay = require('./WorkoutDay')(sequelize);
const WorkoutExercise = require('./WorkoutExercise')(sequelize);
const DietPlan = require('./DietPlan')(sequelize);
const DietMeal = require('./DietMeal')(sequelize);
const Product = require('./Product')(sequelize);
const ProductSale = require('./ProductSale')(sequelize);
const ExpenseCategory = require('./ExpenseCategory')(sequelize);
const Expense = require('./Expense')(sequelize);
const Ledger = require('./Ledger')(sequelize);
const Notification = require('./Notification')(sequelize);
const TrainerAbsence = require('./TrainerAbsence')(sequelize);

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

// Tenant (Shop) back-references for shop-scoped models
[Subscription, Payment, Attendance, TrainerMember, WorkoutPlan, DietPlan,
 Product, ProductSale, SubscriptionPlan, Expense, ExpenseCategory, Ledger,
 Notification, TrainerAbsence].forEach((Model) => {
  Model.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });
});

module.exports = {
  sequelize,
  Sequelize,
  Role,
  User,
  Shop,
  ShopSubscriptionPlan,
  ShopSubscription,
  SubscriptionPlan,
  Subscription,
  Payment,
  Attendance,
  TrainerMember,
  WorkoutPlan,
  WorkoutDay,
  WorkoutExercise,
  DietPlan,
  DietMeal,
  Product,
  ProductSale,
  ExpenseCategory,
  Expense,
  Ledger,
  Notification,
  TrainerAbsence,
};
