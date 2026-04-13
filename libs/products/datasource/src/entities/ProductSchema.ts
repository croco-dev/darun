import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, text, json } from "drizzle-orm/pg-core";
import { ulid } from "ulid";

export const products = pgTable("products", {
  id: varchar("id", { length: 26 }).primaryKey().$default(ulid),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  summary: varchar("summary", { length: 255 }).notNull(),
  description: text("description"),
  logoUrl: varchar("logo_url", { length: 255 }).notNull(),
  ownedCompanyId: varchar("owned_company_id", { length: 26 }),
  categoryIds: json("category_ids").$type<string[]>().notNull().default([]),
  publishedAt: timestamp("published_at"),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
