import { DrizzleToken } from '@darun/provider-database';
import { Client } from '@planetscale/database';
import { drizzle } from 'drizzle-orm/planetscale-serverless';
import * as mongoose from 'mongoose';
import { Container } from 'typedi';
import { DATABASE_URL, DATABASE_PASSWORD, DATABASE_USERNAME, MONGODB_URI } from './environment';

let mySqlConnection: Client;
let drizzleInstance: ReturnType<typeof drizzle>;
let mongooseConnection: mongoose.Mongoose;

export function createMysqlConnection() {
  mySqlConnection ??= new Client({
    host: DATABASE_URL,
    username: DATABASE_USERNAME,
    password: DATABASE_PASSWORD,
  });
  drizzleInstance ??= drizzle(mySqlConnection);
  Container.set(DrizzleToken, drizzleInstance);
}

export function createMongodbConnection() {
  if (!mongooseConnection) {
    mongoose
      .connect(MONGODB_URI, {
        dbName: 'darun',
        autoIndex: true,
        maxPoolSize: 5,
      })
      .then(connection => {
        mongooseConnection = connection;
      });
  }
}
