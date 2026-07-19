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
import { PendingPayment } from './pending-payment.model';
import { OtpRequest } from './otp-request.model';
import { Referral } from './referral.model';

export * from './role.model';
export * from './user.model';
export * from './shop.model';
export * from './shop-subscription-plan.model';
export * from './shop-subscription.model';
export * from './subscription-plan.model';
export * from './subscription.model';
export * from './payment.model';
export * from './attendance.model';
export * from './trainer-member.model';
export * from './workout-plan.model';
export * from './workout-day.model';
export * from './workout-exercise.model';
export * from './diet-plan.model';
export * from './diet-meal.model';
export * from './product.model';
export * from './product-sale.model';
export * from './expense-category.model';
export * from './expense.model';
export * from './ledger.model';
export * from './notification.model';
export * from './trainer-absence.model';
export * from './pending-payment.model';
export * from './otp-request.model';
export * from './referral.model';
export { setupAssociations } from './associations';

export const ALL_MODELS = [
  Role, User, Shop, ShopSubscriptionPlan, ShopSubscription, SubscriptionPlan,
  Subscription, Payment, Attendance, TrainerMember, WorkoutPlan, WorkoutDay,
  WorkoutExercise, DietPlan, DietMeal, Product, ProductSale, ExpenseCategory,
  Expense, Ledger, Notification, TrainerAbsence, PendingPayment, OtpRequest,
  Referral,
];
