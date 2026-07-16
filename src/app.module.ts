import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { setupAssociations } from './models';
import { CommonModule } from './common/common.module';
import { SharedModule } from './shared/shared.module';
import { PublicModule } from './public/public.module';
import { AuthModule } from './auth/auth.module';
import { PlatformModule } from './platform/platform.module';
import { SuperadminModule } from './superadmin/superadmin.module';
import { AdminModule } from './admin/admin.module';
import { TrainerModule } from './trainer/trainer.module';
import { MemberModule } from './member/member.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'gym_management',
      autoLoadModels: true,
      synchronize: false,
      logging: false,
    }),
    ScheduleModule.forRoot(),
    // Super-admin control panel (server-rendered static SPA) at /superadmin.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public', 'superadmin'),
      serveRoot: '/superadmin',
    }),
    // Public account-deletion page required by Play Store data-safety policy —
    // must be a browsable page (not the raw POST /api/v1/auth/delete-account
    // API), reachable without the app or a login. Calls the same endpoint via
    // fetch() client-side.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public', 'account-deletion'),
      serveRoot: '/account-deletion',
    }),
    CommonModule,
    SharedModule,
    PublicModule,
    AuthModule,
    PlatformModule,
    SuperadminModule,
    AdminModule,
    TrainerModule,
    MemberModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements OnApplicationBootstrap {
  onApplicationBootstrap() {
    // Wire Sequelize associations once every model has been registered.
    setupAssociations();
  }
}
