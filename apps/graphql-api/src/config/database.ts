import { DatabaseToken } from '@darun/provider-database';
import { connect, Connection } from '@planetscale/database';
import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { Container } from 'typedi';
import { DATABASE_URL, DATABASE_PASSWORD, DATABASE_USERNAME } from './environment';

let connection: Connection;
let db: ReturnType<typeof drizzle>;
export function createDatabase() {
  connection ??= connect({
    host: DATABASE_URL,
    username: DATABASE_USERNAME,
    password: DATABASE_PASSWORD,
  });
  db ??= drizzle(connection);
  Container.set(DatabaseToken, db);
  return db;
}
