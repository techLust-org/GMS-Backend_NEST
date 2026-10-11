/**
 * Consolidated multi-tenant seed:
 *  - roles (super_admin, admin, trainer, member)
 *  - platform plans (shop_subscription_plans)
 *  - 1 super-admin
 *  - 2 fully-populated demo shops (owner + trainers + members + plans +
 *    subscriptions + attendance + workout/diet plans + products + sales +
 *    expense categories + expenses + ledger + notifications)
 *
 * Every account shares the password: Password123!
 *
 * Usage:
 *   ts-node src/database/seed.ts           # seed
 *   ts-node src/database/seed.ts --reset   # drop the database, then seed
 *   ts-node src/database/seed.ts --drop    # drop the database only
 */
import 'dotenv/config';
import mongoose, { Connection, Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { MODEL_DEFINITIONS } from '../models';
import { DEFAULT_MONGO_URI } from './database.module';

const iso = (d: Date) => d.toISOString().split('T')[0];
const addDays = (base: Date, n: number) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };

type Models = Record<string, Model<any>>;

async function seed(m: Models) {
  const hash = await bcrypt.hash('Password123!', 10);

  // ── Roles ────────────────────────────────────────────────────────────────
  const roles: Record<string, string> = {};
  for (const name of ['super_admin', 'admin', 'trainer', 'member']) {
    const r = await m.Role.findOneAndUpdate(
      { name },
      { $setOnInsert: { name } },
      { upsert: true, new: true },
    );
    roles[name] = r.id;
  }

  // ── Platform plans (what we sell to owners) ───────────────────────────────
  await m.ShopSubscriptionPlan.insertMany([
    { name: 'Starter', plan_type: 'monthly', duration_days: 30, base_price: 2999, discount: 500, sell_price: 2499, description: 'Up to 100 members', is_active: true },
    { name: 'Pro', plan_type: 'quarterly', duration_days: 90, base_price: 8999, discount: 1500, sell_price: 7499, description: 'Up to 500 members + analytics', is_active: true },
    { name: 'Elite', plan_type: 'yearly', duration_days: 365, base_price: 29999, discount: 5000, sell_price: 24999, description: 'Unlimited members + priority support', is_active: true },
  ]);
  const proPlan = await m.ShopSubscriptionPlan.findOne({ name: 'Pro' });

  // ── Super admin (no shop) ─────────────────────────────────────────────────
  await m.User.create({
    role_id: roles.super_admin, shop_id: null,
    first_name: 'Platform', last_name: 'Admin',
    email: 'super@platform.com', password_hash: hash,
    phone: '+91-90000-00000', gender: 'other', status: 'active',
  });

  // ── Demo shops ────────────────────────────────────────────────────────────
  const shopConfigs = [
    {
      name: 'Iron Paradise Gym', slug: 'ironparadise',
      phone: '+91-98000-11111', address: '12 MG Road, Bengaluru',
      ownerName: ['Rahul', 'Verma'],
      trainers: [['Marcus', 'Williams', 'Strength & Conditioning'], ['Sarah', 'Johnson', 'Yoga & Mobility']],
      members: [
        ['Alex', 'Turner', 'male'], ['Emily', 'Chen', 'female'], ['David', 'Kumar', 'male'],
        ['Sofia', 'Martinez', 'female'], ['James', 'Lee', 'male'],
      ],
    },
    {
      name: 'FlexFit Studio', slug: 'flexfit',
      phone: '+91-98000-22222', address: '45 Anna Salai, Chennai',
      ownerName: ['Anita', 'Nair'],
      trainers: [['Chris', 'Evans', 'CrossFit'], ['Priya', 'Sharma', 'Pilates']],
      members: [
        ['Karan', 'Mehta', 'male'], ['Divya', 'Rao', 'female'], ['Sameer', 'Khan', 'male'],
        ['Neha', 'Gupta', 'female'], ['Arjun', 'Reddy', 'male'],
      ],
    },
  ];

  for (const cfg of shopConfigs) {
    await seedShop(m, cfg, roles, proPlan, hash);
  }
}

async function seedShop(m: Models, cfg: any, roles: Record<string, string>, proPlan: any, hash: string) {
  const today = new Date();
  const email = (who: string) => `${who}@${cfg.slug}.com`;

  // Owner + shop (owner first, then link shop_id)
  const owner = await m.User.create({
    role_id: roles.admin, shop_id: null,
    first_name: cfg.ownerName[0], last_name: cfg.ownerName[1],
    email: `owner@${cfg.slug}.com`, password_hash: hash,
    phone: cfg.phone, gender: 'other', status: 'active',
  });
  const shop = await m.Shop.create({
    name: cfg.name, owner_id: owner.id, phone: cfg.phone,
    email: `contact@${cfg.slug}.com`, address: cfg.address, is_active: true,
  });
  await owner.set({ shop_id: shop.id }).save();
  const shopId = shop.id;

  // Active platform subscription (Pro, 90 days). Seed rows carry no Razorpay
  // ids — razorpay_payment_id is unique, so a shared placeholder can't be used.
  await m.ShopSubscription.create({
    shop_id: shopId, plan_id: proPlan.id,
    base_price: proPlan.base_price, sell_price: proPlan.sell_price,
    status: 'active', start_date: iso(today), end_date: iso(addDays(today, 90)),
  });

  // Trainers
  const trainers: any[] = [];
  for (let i = 0; i < cfg.trainers.length; i++) {
    const [fn, ln, spec] = cfg.trainers[i];
    trainers.push(await m.User.create({
      role_id: roles.trainer, shop_id: shopId,
      first_name: fn, last_name: ln, email: email(`trainer${i + 1}`), password_hash: hash,
      phone: cfg.phone, gender: i % 2 ? 'female' : 'male',
      hire_date: iso(addDays(today, -300)), salary: 25000 + i * 3000,
      specialization: spec, bio: `${spec} specialist.`, status: 'active',
    }));
  }

  // Members
  const members: any[] = [];
  for (let i = 0; i < cfg.members.length; i++) {
    const [fn, ln, g] = cfg.members[i];
    members.push(await m.User.create({
      role_id: roles.member, shop_id: shopId,
      first_name: fn, last_name: ln, email: email(`member${i + 1}`), password_hash: hash,
      phone: cfg.phone, gender: g, date_of_birth: '1995-06-15',
      emergency_contact: 'Emergency: ' + cfg.phone,
      govt_id_url: 'https://example.com/id/' + cfg.slug + (i + 1) + '.jpg',
      status: 'active',
    }));
  }

  // Member subscription plans (shop-scoped)
  const plans = await m.SubscriptionPlan.insertMany([
    { shop_id: shopId, name: 'Monthly', duration: 'monthly', duration_days: 30, base_price: 1500, discount: 0, sell_price: 1500, description: 'Full gym access for a month', is_active: true },
    { shop_id: shopId, name: 'Quarterly', duration: 'quarterly', duration_days: 90, base_price: 4500, discount: 500, sell_price: 4000, description: '3 months access + 1 free PT session', is_active: true },
    { shop_id: shopId, name: 'Yearly', duration: 'yearly', duration_days: 365, base_price: 18000, discount: 3000, sell_price: 15000, description: '12 months access + diet plan', is_active: true },
  ]);

  // Subscriptions + payments + ledger for first 4 members (last is unsubscribed)
  for (let i = 0; i < 4; i++) {
    const member = members[i];
    const plan: any = plans[i % plans.length];
    const start = addDays(today, -20 + i);
    const end = addDays(start, plan.duration_days);
    const sub = await m.Subscription.create({
      shop_id: shopId, member_id: member.id, plan_id: plan.id,
      start_date: iso(start), end_date: iso(end), status: 'active',
      base_price: plan.base_price, sell_price: plan.sell_price, amount_paid: plan.sell_price,
      payment_method: 'razorpay',
    });
    await m.Payment.create({
      shop_id: shopId, member_id: member.id, subscription_id: sub.id,
      amount: plan.sell_price, payment_date: iso(start), payment_method: 'razorpay',
    });
    await m.Ledger.create({ shop_id: shopId, type: 'credit', amount: plan.sell_price, reference: 'subscription', reference_id: sub.id, entry_date: iso(start) });
  }

  // Attendance for first 3 members over last 15 days (skip Sundays)
  for (let i = 0; i < 3; i++) {
    const member = members[i];
    for (let d = 15; d >= 1; d--) {
      const day = addDays(today, -d);
      if (day.getDay() === 0) continue;
      if ((d + i) % 4 === 0) continue; // ~75% attendance
      const checkIn = new Date(day); checkIn.setHours(7 + (i % 3), 15, 0);
      const checkOut = new Date(checkIn); checkOut.setHours(checkIn.getHours() + 1, 30, 0);
      await m.Attendance.create({
        shop_id: shopId, member_id: member.id, attendance_date: iso(day),
        check_in_time: checkIn, check_out_time: checkOut,
      });
    }
  }

  // Trainer-member assignments (t0 -> members 0,1,2 ; t1 -> members 3,4)
  const assignMap: [number, number[]][] = [[0, [0, 1, 2]], [1, [3, 4]]];
  for (const [ti, mis] of assignMap) {
    if (!trainers[ti]) continue;
    for (const mi of mis) {
      await m.TrainerMember.create({
        shop_id: shopId, trainer_id: trainers[ti].id, member_id: members[mi].id,
        is_active: true, assigned_at: new Date(),
      });
    }
  }

  // Workout + diet plans for first 3 members
  const workoutSets: [string, string, [string, number, number][]][] = [
    ['Strength Builder', 'Muscle gain', [['Barbell Squat', 4, 8], ['Bench Press', 4, 8], ['Deadlift', 3, 5]]],
    ['Fat Loss Circuit', 'Weight loss', [['Burpees', 3, 15], ['Mountain Climbers', 3, 20], ['Jump Rope', 3, 60]]],
    ['General Fitness', 'Overall health', [['Push-ups', 3, 12], ['Lunges', 3, 12], ['Plank', 3, 45]]],
  ];
  const dietSets: [string, number, number, number, number][] = [
    ['Muscle Gain Diet', 3200, 200, 350, 80],
    ['Weight Loss Diet', 1600, 130, 150, 50],
    ['Balanced Nutrition', 2400, 150, 260, 70],
  ];
  for (let i = 0; i < 3; i++) {
    const member = members[i];
    const [title, goal, exs] = workoutSets[i];
    const wp = await m.WorkoutPlan.create({
      shop_id: shopId, trainer_id: trainers[assignMap[0][1].includes(i) ? 0 : 1].id,
      member_id: member.id, title, goal, description: `${goal} focused program`, is_active: true,
      start_date: iso(addDays(today, -10)), end_date: iso(addDays(today, 50)),
    });
    for (const dow of ['monday', 'wednesday', 'friday']) {
      const day = await m.WorkoutDay.create({ workout_plan_id: wp.id, day_of_week: dow, notes: 'Warm up 10 min' });
      let oi = 0;
      for (const [name, sets, reps] of exs) {
        await m.WorkoutExercise.create({ workout_day_id: day.id, name, sets, reps, rest_secs: 60, order_index: oi++ });
      }
    }

    const [dtitle, cal, p, c, f] = dietSets[i];
    const dp = await m.DietPlan.create({
      shop_id: shopId, trainer_id: wp.trainer_id, member_id: member.id, title: dtitle,
      description: 'Coach-designed nutrition plan', daily_calories: cal, protein_grams: p, carbs_grams: c, fat_grams: f, is_active: true,
    });
    const meals: [string, string, string, number][] = [
      ['Breakfast', '07:00', 'Oats, eggs, banana', Math.round(cal * 0.25)],
      ['Lunch', '13:00', 'Chicken, rice, salad', Math.round(cal * 0.35)],
      ['Dinner', '19:00', 'Fish, veggies, quinoa', Math.round(cal * 0.30)],
    ];
    let mi = 0;
    for (const [mn, mt, foods, mcal] of meals) {
      await m.DietMeal.create({ diet_plan_id: dp.id, meal_name: mn, meal_time: mt, foods, calories: mcal, order_index: mi++ });
    }
  }

  // Products (shop-scoped)
  const products: any[] = await m.Product.insertMany([
    { shop_id: shopId, name: 'Whey Protein 1kg', description: 'Chocolate whey isolate', cost_price: 1800, discount: 200, sell_price: 2200, stock_qty: 25, category: 'supplements', sku: `${cfg.slug}-WHEY`, low_stock_threshold: 5 },
    { shop_id: shopId, name: 'Creatine 300g', description: 'Micronized monohydrate', cost_price: 700, discount: 0, sell_price: 999, stock_qty: 40, category: 'supplements', sku: `${cfg.slug}-CREA`, low_stock_threshold: 5 },
    { shop_id: shopId, name: 'Resistance Bands', description: 'Set of 5', cost_price: 500, discount: 100, sell_price: 799, stock_qty: 8, category: 'equipment', sku: `${cfg.slug}-BAND`, low_stock_threshold: 10 },
    { shop_id: shopId, name: 'Shaker Bottle', description: '700ml BPA-free', cost_price: 150, discount: 0, sell_price: 349, stock_qty: 3, category: 'accessories', sku: `${cfg.slug}-SHAKE`, low_stock_threshold: 5 },
  ]);

  // A couple of product sales + payment + ledger
  for (let i = 0; i < 2; i++) {
    const product = products[i];
    const member = members[i];
    const total = parseFloat(product.sell_price);
    const sale = await m.ProductSale.create({
      shop_id: shopId, product_id: product.id, member_id: member.id, quantity: 1,
      unit_price: product.sell_price, total_price: total, order_mode: 'online',
      payment_mode: 'razorpay', sold_by: member.id, sale_date: iso(addDays(today, -i - 1)),
    });
    await product.set({ stock_qty: product.stock_qty - 1 }).save();
    await m.Payment.create({ shop_id: shopId, member_id: member.id, product_sale_id: sale.id, amount: total, payment_date: iso(addDays(today, -i - 1)), payment_method: 'razorpay' });
    await m.Ledger.create({ shop_id: shopId, type: 'credit', amount: total, reference: 'sale', reference_id: sale.id, entry_date: iso(addDays(today, -i - 1)) });
  }

  // Expense categories + expenses + ledger
  const cats: any[] = await m.ExpenseCategory.insertMany([
    { shop_id: shopId, name: 'Rent', type: 'debit' },
    { shop_id: shopId, name: 'Utilities', type: 'debit' },
    { shop_id: shopId, name: 'Trainer Salary', type: 'debit' },
    { shop_id: shopId, name: 'Equipment', type: 'debit' },
    { shop_id: shopId, name: 'Maintenance', type: 'debit' },
    { shop_id: shopId, name: 'Product Sell', type: 'credit' },
    { shop_id: shopId, name: 'Product Cost', type: 'debit' },
    { shop_id: shopId, name: 'Subscription', type: 'credit' },
  ]);
  const catByName = Object.fromEntries(cats.map((c) => [c.name, c]));

  const expenseRows: [string, string, number, string | null][] = [
    ['Rent', 'Monthly rent', 30000, null],
    ['Utilities', 'Electricity + water', 4500, null],
    ['Trainer Salary', `Salary - ${cfg.trainers[0][0]}`, 25000, trainers[0].id],
    ['Equipment', 'New treadmill', 55000, null],
  ];
  for (const [catName, desc, amt, trainerId] of expenseRows) {
    const date = iso(addDays(today, -5));
    const exp = await m.Expense.create({
      shop_id: shopId, category_id: catByName[catName].id, description: desc, amount: amt,
      expense_date: date, paid_to: catName === 'Trainer Salary' ? `${cfg.trainers[0][0]} ${cfg.trainers[0][1]}` : 'Vendor',
      trainer_id: trainerId,
    });
    await m.Ledger.create({ shop_id: shopId, type: 'debit', amount: amt, reference: 'expense', reference_id: exp.id, entry_date: date });
  }

  // Welcome notifications
  await m.Notification.insertMany(members.map((mem) => ({
    shop_id: shopId, user_id: mem.id, type: 'gym_announcement',
    title: `Welcome to ${cfg.name}!`, message: 'Your account is ready. Check out your plans and shop.',
    is_read: false,
  })));
}

async function main() {
  const args = process.argv.slice(2);
  const connection: Connection = await mongoose
    .createConnection(process.env.MONGO_URI || DEFAULT_MONGO_URI)
    .asPromise();
  try {
    if (args.includes('--reset') || args.includes('--drop')) {
      await connection.dropDatabase();
      // eslint-disable-next-line no-console
      console.log(`Dropped database "${connection.name}"`);
      if (args.includes('--drop')) return;
    }

    const models: Models = {};
    for (const { name, schema } of MODEL_DEFINITIONS) models[name] = connection.model(name, schema);
    await Promise.all(Object.values(models).map((model) => model.syncIndexes()));

    await seed(models);
    // eslint-disable-next-line no-console
    console.log(`Seeded database "${connection.name}"`);
  } finally {
    await connection.close();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
