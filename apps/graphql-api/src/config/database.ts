import { connect, Connection } from '@planetscale/database';
import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { DATABASE_HOST, DATABASE_PASSWORD, DATABASE_USERNAME } from './environment';

let connection: Connection;
export function createDatabase() {
  connection ??= connect({
    host: DATABASE_HOST,
    username: DATABASE_USERNAME,
    password: DATABASE_PASSWORD,
  });
  return drizzle(connection);
}
