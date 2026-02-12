import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './libs/backend/src/libs/translation/datasource/entities/TranslationSchema.ts',
  out: './libs/backend/drizzle',
  dialect: 'postgresql',
});
