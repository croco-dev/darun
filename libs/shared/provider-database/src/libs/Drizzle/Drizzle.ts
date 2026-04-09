import { drizzle } from 'drizzle-orm/postgres-js';
import { Token } from 'typedi';

export type Drizzle = ReturnType<typeof drizzle>;
export const DrizzleToken = new Token<Drizzle>('Drizzle');
