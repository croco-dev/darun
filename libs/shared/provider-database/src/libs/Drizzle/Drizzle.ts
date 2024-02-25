import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { Token } from 'typedi';

export type Drizzle = ReturnType<typeof drizzle>;
export const DrizzleToken = new Token<Drizzle>('Drizzle');
