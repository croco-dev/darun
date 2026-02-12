import { index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const translations = pgTable(
  'translations',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    locale: text('locale').notNull(),
    field: text('field').notNull(),
    value: text('value').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    uniqueTranslation: uniqueIndex('unique_translation').on(
      table.entityType,
      table.entityId,
      table.locale,
      table.field
    ),
    entityLocaleIdx: index('entity_locale_idx').on(table.entityType, table.entityId, table.locale),
  })
);
