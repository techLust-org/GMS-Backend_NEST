import { Global, Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { MongooseModule, InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MODEL_DEFINITIONS } from '../models';

// Multi-document transactions (signup, payments, orders) need a replica set —
// see docker-compose.yml for a single-node one.
export const DEFAULT_MONGO_URI = 'mongodb://localhost:27017/gym_management?replicaSet=rs0';

// Every model is registered once here, globally, so any service can inject
// any model and populate() can resolve every association by model name.
@Global()
@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || DEFAULT_MONGO_URI),
    MongooseModule.forFeature(MODEL_DEFINITIONS),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule implements OnApplicationBootstrap {
  private readonly logger = new Logger('Database');

  constructor(@InjectConnection() private readonly connection: Connection) {}

  // Replaces the SQL migrations' constraints: builds the unique / partial
  // unique indexes the idempotency checks rely on, and drops stale ones.
  async onApplicationBootstrap() {
    await Promise.all(Object.values(this.connection.models).map((m) => m.syncIndexes()));
    this.logger.log('Indexes in sync');
  }
}
