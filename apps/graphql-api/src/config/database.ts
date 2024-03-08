import { DrizzleToken } from '@darun/provider-database';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as mongoose from 'mongoose';
import postgres from 'postgres';

import { Container } from 'typedi';
import { DATABASE_URL, MONGODB_URI } from './environment';

let postgresqlConnection: ReturnType<typeof postgres>;
let drizzleInstance: ReturnType<typeof drizzle>;
let mongooseConnection: mongoose.Mongoose;

export function createMysqlConnection() {
  postgresqlConnection ??= postgres(DATABASE_URL, { prepare: false });
  drizzleInstance ??= drizzle(postgresqlConnection);
  Container.set(DrizzleToken, drizzleInstance);
}

export function createMongodbConnection() {
  if (!mongooseConnection) {
    mongoose
      .connect(MONGODB_URI, {
        dbName: 'darun',
        autoIndex: true,
        maxPoolSize: 3,
      })
      .then(connection => {
        mongooseConnection = connection;
      });
  }
}
