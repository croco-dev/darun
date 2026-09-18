import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export type JournalEntry = {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
};

export type Journal = {
  version: string;
  dialect: string;
  entries: JournalEntry[];
};

export function validateJournalEntries(entries: JournalEntry[]): void {
  if (!entries || entries.length === 0) {
    throw new Error('Migration journal has no entries');
  }

  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1]!;
    const curr = entries[i]!;

    if (curr.when <= prev.when) {
      throw new Error(
        `Migration timestamp ordering error: "${curr.tag}" (when: ${curr.when}) is <= "${prev.tag}" (when: ${prev.when}). Drizzle migrator requires strictly increasing timestamps!`
      );
    }
  }
}

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
    const journalPath = join(migrationsFolder, 'meta', '_journal.json');

    if (!existsSync(journalPath)) {
      throw new Error(`Migration journal not found at ${journalPath}`);
    }

    const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as Journal;
    validateJournalEntries(journal.entries);

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
      const initialEntry = journal.entries[0];

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

    const beforeMigrations = await client`
      SELECT created_at FROM "drizzle"."__drizzle_migrations"
    `;
    const beforeSet = new Set(beforeMigrations.map(r => Number(r['created_at'])));
    const pending = journal.entries.filter(e => !beforeSet.has(e.when));
    console.log(
      `Pending migrations (${pending.length}): ${pending.map(e => `${e.tag} (${e.when})`).join(', ') || 'none'}`
    );

    await migrate(db, { migrationsFolder });

    // Verify that every migration in _journal.json is recorded in __drizzle_migrations
    const afterMigrations = await client`
      SELECT created_at FROM "drizzle"."__drizzle_migrations"
    `;
    const afterSet = new Set(afterMigrations.map(r => Number(r['created_at'])));
    const unapplied = journal.entries.filter(e => !afterSet.has(e.when));

    if (unapplied.length > 0) {
      throw new Error(
        `Migration verification failed! The following migrations in _journal.json were skipped or not recorded in __drizzle_migrations: ${unapplied.map(e => `${e.tag} (${e.when})`).join(', ')}`
      );
    }

    console.log('✅ Database migrations completed successfully and verified against journal');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  void runMigrations();
}
