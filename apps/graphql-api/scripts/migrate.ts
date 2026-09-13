import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

async function runMigrations(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required for migrations');
    process.exit(1);
  }

  const maskedUrl = databaseUrl.replace(/:[^:@]+@/, ':****@');
  console.log(`Starting database migrations on: ${maskedUrl}`);

  const client = postgres(databaseUrl, { prepare: false, max: 1 });
  const db = drizzle(client);

  try {
    const migrationsFolder = join(__dirname, 'migrations');

    // Ensure drizzle schema and __drizzle_migrations table exist
    await client`CREATE SCHEMA IF NOT EXISTS "drizzle"`;
    await client`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `;

    // Detect if database was already initialized before Drizzle migrations were introduced
    // (e.g. core table "profiles" already exists in public schema)
    const existingProfiles = await client`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'profiles'
      LIMIT 1
    `;

    if (existingProfiles.length > 0) {
      const journalPath = join(migrationsFolder, 'meta', '_journal.json');
      if (existsSync(journalPath)) {
        const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
          entries?: { tag: string; when: number }[];
        };
        const initialEntry = journal.entries?.[0];

        if (initialEntry) {
          const recorded = await client`
            SELECT 1 FROM "drizzle"."__drizzle_migrations"
            WHERE created_at = ${initialEntry.when}
            LIMIT 1
          `;

          if (recorded.length === 0) {
            console.log(`Existing database detected. Baselining initial migration (${initialEntry.tag})...`);
            const initialSqlPath = join(migrationsFolder, `${initialEntry.tag}.sql`);
            const initialSql = readFileSync(initialSqlPath, 'utf8');
            const initialHash = createHash('sha256').update(initialSql).digest('hex');

            await client`
              INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
              VALUES (${initialHash}, ${initialEntry.when})
            `;
            console.log(`Baselined ${initialEntry.tag} (when: ${initialEntry.when})`);
          }
        }
      }
    }

    await migrate(db, { migrationsFolder });
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

void runMigrations();
