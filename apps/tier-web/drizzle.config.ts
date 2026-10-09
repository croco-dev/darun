import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config({});

export default defineConfig({
  schema: './src/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  out: './drizzle',
  verbose: true,
  strict: true,
});
