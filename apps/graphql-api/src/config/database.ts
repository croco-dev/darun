import { DrizzleToken } from '@darun/provider-database';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as mongoose from 'mongoose';
import postgres from 'postgres';

import { Container } from 'typedi';
import { DATABASE_URL, IS_LOCAL, MONGODB_URI } from './environment';

let postgresqlConnection: ReturnType<typeof postgres>;
let drizzleInstance: ReturnType<typeof drizzle>;
let mongooseConnection: mongoose.Mongoose;
let mongooseConnectionPromise: Promise<void> | undefined;

export function createMysqlConnection() {
  postgresqlConnection ??= postgres(DATABASE_URL, { prepare: false });
  drizzleInstance ??= drizzle(postgresqlConnection);
  Container.set(DrizzleToken, drizzleInstance);
}

export function createMongodbConnection(): void | Promise<void> {
  if (mongooseConnection) return;

  if (!mongooseConnectionPromise) {
    mongooseConnectionPromise = mongoose
      .connect(MONGODB_URI, {
        dbName: 'darun',
        autoIndex: IS_LOCAL,
        maxPoolSize: 3,
      })
      .then(connection => {
        mongooseConnection = connection;
      })
      .catch(error => {
        console.error('MongoDB connection failed:', error);
        throw error;
      });
  }

  return mongooseConnectionPromise;
}
