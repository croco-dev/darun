import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const llmSettings = pgTable('llm_settings', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => 'default'),
  endpoint: text('endpoint').notNull().default('https://openrouter.ai/api/v1'),
  apiKey: text('api_key'),
  model: text('model').notNull().default('nvidia/nemotron-3-ultra-550b-a55b:free'),
  thinkingLevel: text('thinking_level'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type LlmSettingRow = typeof llmSettings.$inferSelect;
export type InsertLlmSettingRow = typeof llmSettings.$inferInsert;
