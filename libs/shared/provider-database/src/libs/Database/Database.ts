import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { Token } from 'typedi';

export type Database = ReturnType<typeof drizzle>;
export const DatabaseToken = new Token<Database>('Database');
