import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Token } from 'typedi';

export type Drizzle = PostgresJsDatabase;
export const DrizzleToken = new Token<Drizzle>('Drizzle');
