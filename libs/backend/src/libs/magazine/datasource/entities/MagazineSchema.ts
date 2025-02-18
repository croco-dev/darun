import { sql } from 'drizzle-orm';
import { pgTable, varchar, timestamp, text } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

export const magazines = pgTable('magazines', {
  id: varchar('id', { length: 26 }).primaryKey().$default(ulid),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 150 }).notNull().unique(),
  summary: varchar('summary', { length: 255 }),
  content: text('content'),
  backgroundImageUrl: varchar('background_image_url', { length: 255 }).notNull(),
  logoImageUrl: varchar('logo_image_url', { length: 255 }),
  authorId: varchar('author_id', { length: 50 }).notNull(),
  publishedAt: timestamp('published_at'),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
