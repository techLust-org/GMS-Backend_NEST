# GymAxis Backend

Multi-tenant gym management platform API built with NestJS. Powers the GymAxis mobile app and super-admin control panel.

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** NestJS 10
- **Database:** PostgreSQL 15 (via Docker)
- **ORM:** Sequelize 6 (sequelize-typescript)
- **Auth:** JWT + Google Sign-In + Firebase Phone Auth + WhatsApp OTP
- **Payments:** Razorpay
- **Storage:** AWS S3 (presigned URLs for uploads)
- **Notifications:** Firebase Cloud Messaging (push) + Nodemailer (email)
- **Scheduling:** @nestjs/schedule (cron jobs)
- **Security:** Helmet, rate limiting (@nestjs/throttler), CORS, bcrypt

## Architecture

Multi-tenant SaaS: each gym (shop) is an isolated tenant. Users belong to a shop and are scoped by role.

### Roles

| Role | Description |
|------|-------------|
| `super_admin` | Platform owner. Manages all shops, plans, billing. |
| `admin` | Gym owner. Manages their shop, trainers, members, products, finances. |
| `trainer` | Assigned to members. Creates workout/diet plans, marks absences. |
| `member` | End user. Views plans, checks attendance, buys products. |

### Guards

- `JwtAuthGuard` — validates Bearer token
- `RolesGuard` — enforces role-based access
- `TenantGuard` — extracts and validates shop context
- `ActiveShopGuard` — blocks access if shop subscription is lapsed

## Project Structure

```
src/
├── main.ts                    # Bootstrap, CORS, helmet, global prefix
├── app.module.ts              # Root module wiring
├── health.controller.ts       # GET /health
├── common/                    # Guards, decorators, interceptors, filters
├── models/                    # Sequelize models + associations
├── shared/                    # Global services (S3, mail, push, razorpay, cron, etc.)
├── auth/                      # Login, register, Google/Phone/WhatsApp auth, profile
├── platform/                  # Owner's platform subscription management
├── superadmin/                # Super-admin control panel APIs
├── admin/                     # Gym owner APIs (users, products, finances, attendance, etc.)
│   ├── users/                 # CRUD trainers & members
│   ├── shop/                  # Shop settings, logo, cover image
│   ├── products/              # Inventory & sales
│   ├── financial/             # Revenue, expenses, monthly reports, CSV export
│   ├── attendance/            # Today's check-ins
│   ├── member-plans/          # Subscription plans sold to members
│   ├── expense-categories/    # Expense categories
│   ├── orders/                # Product orders
│   └── notifications/         # Push notifications to users
├── trainer/                   # Trainer APIs
│   ├── members/               # Assigned members list
│   ├── plans/                 # Workout & diet plan CRUD
│   ├── absence/               # Leave/absence requests
│   └── notifications/         # Trainer notifications
├── member/                    # Member APIs
│   ├── subscription/          # View/purchase subscriptions
│   ├── attendance/            # Check-in/check-out
│   ├── plans/                 # View workout & diet plans
│   ├── shop/                  # Shop info & products
│   └── notifications/         # Member notifications
├── documents/                 # ID document upload & verification (S3 + masked previews)
└── public/                    # Unauthenticated endpoints (shop discovery, registration)
```

## API Routes

All routes are prefixed with `/api/v1/` (except `/health`).

| Prefix | Auth | Description |
|--------|------|-------------|
| `auth/` | Mixed | Login, register, OAuth, profile, FCM token |
| `platform/` | Admin | Platform subscription, plans, Razorpay orders |
| `superadmin/` | Super Admin | Shops CRUD, platform plans, revenue, DB backup |
| `admin/users/` | Admin | Trainer & member management |
| `admin/shop/` | Admin | Shop settings, logo, cover, open/closed |
| `admin/products/` | Admin | Product inventory & sales |
| `admin/financial/` | Admin | Revenue, expenses, reports, CSV export |
| `admin/attendance/` | Admin | Today's attendance overview |
| `admin/member-plans/` | Admin | Member subscription plans |
| `admin/expense-categories/` | Admin | Expense category management |
| `admin/orders/` | Admin | Order management |
| `admin/notifications/` | Admin | Send push notifications |
| `trainer/members/` | Trainer | View assigned members |
| `trainer/plans/` | Trainer | Workout & diet plan CRUD |
| `trainer/absence/` | Trainer | Absence/leave management |
| `member/subscription/` | Member | View & purchase subscriptions |
| `member/attendance/` | Member | Check-in / check-out |
| `member/plans/` | Member | View assigned plans |
| `member/shop/` | Member | Shop info & product catalog |
| `documents/` | Mixed | ID document upload & verification |
| `public/` | None | Shop discovery, public registration |

## Prerequisites

- Node.js >= 18
- Docker & Docker Compose
- AWS account (S3 bucket)
- Razorpay account
- Firebase project (for push notifications & phone auth)

## Setup

### 1. Start PostgreSQL

```bash
cd /path/to/GYM_MAN
docker compose up -d
```

This starts a PostgreSQL 15 container (`gym_postgres`) on port 5432.

### 2. Install dependencies

```bash
cd backend_nest
npm install
```

### 3. Configure environment

Copy `.env.example` or create `.env` with:

```env
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gym_management
DB_USER=postgres
DB_PASSWORD=postgres

# Auth
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx

# AWS S3
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=your-bucket-name

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=app_password
FROM_EMAIL=your@email.com

# Firebase (push notifications & phone auth)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Sign-In
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com

# WhatsApp OTP (optional)
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_OTP_TEMPLATE_NAME=otp_verification

FRONTEND_URL=http://localhost:5173
```

### 4. Run migrations & seed

```bash
npm run db:migrate
npm run db:seed
```

This creates all tables and seeds demo data including:
- Super admin: `super@platform.com` / `Password123!`
- 2 demo gyms with owners, trainers, members, subscriptions, products, and attendance data

### 5. Start the server

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

Server runs on `http://localhost:5000`.

## Database

### Migrations

```bash
npm run db:migrate          # Run all pending migrations
npm run db:migrate:undo     # Undo all migrations
npm run db:reset            # Undo + migrate + seed
```

### Models

| Model | Description |
|-------|-------------|
| Role | User roles (super_admin, admin, trainer, member) |
| User | All users across all tenants |
| Shop | Gym tenants |
| ShopSubscriptionPlan | Platform plans sold to gym owners |
| ShopSubscription | Active platform subscriptions per shop |
| SubscriptionPlan | Member plans created by gym owners |
| Subscription | Member subscriptions within a gym |
| Payment | Payment records |
| PendingPayment | Razorpay orders awaiting confirmation |
| Attendance | Check-in / check-out records |
| TrainerMember | Trainer-member assignments |
| WorkoutPlan / WorkoutDay / WorkoutExercise | Workout programming |
| DietPlan / DietMeal | Nutrition plans |
| Product / ProductSale | Shop inventory & sales |
| ExpenseCategory / Expense | Expense tracking |
| Ledger | Double-entry financial ledger |
| Notification | In-app notifications |
| OtpRequest | WhatsApp OTP verification |
| UserDocument / DocumentAccessLog | ID document uploads & audit trail |
| Referral | Referral program tracking |
| TrainerAbsence | Trainer leave records |

## Cron Jobs

| Schedule | Job | Description |
|----------|-----|-------------|
| `0 0 1 * * *` (12:01 AM) | Daily maintenance | Auto-close open check-ins, expire subscriptions, send expiry reminders |
| `0 1 * * *` (1:00 AM) | Database backup | pg_dump + gzip, upload to S3 at `db/backups/` |

## Database Backup & Restore

### Automatic

Runs daily at 1:00 AM. Backup is uploaded to:
```
s3://<bucket>/db/backups/gymaxis_DD_MM_YY.sql.gz
```

### Manual trigger

```
GET /api/v1/superadmin/db-backup
```
(Requires super_admin JWT)

Or use the "Start Backup" button in the super-admin panel under Settings.

### Restore from backup

```bash
# 1. Download the backup
aws s3 cp s3://<bucket>/db/backups/gymaxis_DD_MM_YY.sql.gz ./backup.sql.gz

# 2. Drop and recreate the database
docker exec gym_postgres psql -U postgres -c "DROP DATABASE gym_management;"
docker exec gym_postgres psql -U postgres -c "CREATE DATABASE gym_management;"

# 3. Restore
gunzip -c backup.sql.gz | docker exec -i gym_postgres psql -U postgres -d gym_management
```

## Super Admin Panel

A server-rendered SPA at `/superadmin`. Features:
- Dashboard with platform-wide KPIs
- Shop management (create, grant/revoke access, extend subscriptions)
- Platform plan CRUD
- Revenue log
- Manual database backup trigger
- Password management

Login: `super@platform.com` / `Password123!`

## S3 Bucket Layout

```
<bucket>/
├── db/backups/                              # Database backups
├── <shopId>/owner/profiles/                 # Owner avatar, shop logo, cover
├── <shopId>/users/<userId>/profiles/        # Member/trainer avatars
└── <shopId>/users/<userId>/documents/       # ID documents (encrypted at rest)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript |
| `npm run start` | Start (no watch) |
| `npm run start:dev` | Start with hot reload |
| `npm run start:prod` | Start compiled build |
| `npm run db:migrate` | Run migrations |
| `npm run db:migrate:undo` | Undo all migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:seed:undo` | Remove seeded data |
| `npm run db:reset` | Full DB reset (undo + migrate + seed) |

## Production Notes

- Set `NODE_ENV=production` to enable SSL for database connections
- The app uses Helmet with CSP disabled (for the inline super-admin panel)
- Rate limiting: 30 requests/minute globally, stricter on auth endpoints
- All API responses are wrapped in `{ success, message, data }` format
- The Docker host running the NestJS app needs `docker` CLI access for the backup cron to work
