import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { verifyInitialSchema } from './verify-initial-schema';

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

async function verifyBaselineRequest(
  client: postgres.Sql,
  initialEntry: JournalEntry,
  migrationsFolder: string,
  baselineInitial: boolean
): Promise<void> {
  const [journalTable] = await client`SELECT to_regclass('drizzle.__drizzle_migrations') AS name`;
  const recorded = journalTable?.['name'] ? await client`SELECT created_at FROM "drizzle"."__drizzle_migrations"` : [];
  const hasInitial = recorded.some(row => Number(row['created_at']) === initialEntry.when);
  if (baselineInitial && recorded.length > 0) {
    throw new Error('Baseline requires an unrecorded legacy database; existing migration history is unchanged');
  }
  if (!hasInitial) {
    if (baselineInitial) {
      await verifyInitialSchema(client, migrationsFolder, initialEntry.tag);
    } else {
      const tables = await client`
        SELECT 1 FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f') LIMIT 1
      `;
      if (tables.length) {
        throw new Error(
          'Unrecorded existing schema: inspect it and explicitly run migrate --baseline-initial; no baseline recorded'
        );
      }
    }
  }
}

async function runMigrations(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required for migrations');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--baseline-initial') || args.length > 1) {
    throw new Error('Usage: migrate [--baseline-initial]');
  }
  const baselineInitial = args.includes('--baseline-initial');
  console.log('Starting database migrations');

  const client = postgres(databaseUrl, { prepare: false, max: 1 });
  const db = drizzle(client);

  try {
    await client`SET search_path TO public`;
    const migrationsFolder = join(__dirname, 'migrations');
    const journalPath = join(migrationsFolder, 'meta', '_journal.json');

    if (!existsSync(journalPath)) {
      throw new Error(`Migration journal not found at ${journalPath}`);
    }

    const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as Journal;
    validateJournalEntries(journal.entries);

    const initialEntry = journal.entries[0]!;
    await verifyBaselineRequest(client, initialEntry, migrationsFolder, baselineInitial);

    await client`CREATE SCHEMA IF NOT EXISTS "drizzle"`;
    await client`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `;
    if (baselineInitial) {
      const initialSql = readFileSync(join(migrationsFolder, `${initialEntry.tag}.sql`), 'utf8');
      const initialHash = createHash('sha256').update(initialSql).digest('hex');
      await client`
        INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
        VALUES (${initialHash}, ${initialEntry.when})
      `;
      console.log(`Baselined verified initial schema: ${initialEntry.tag}`);
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
    const message =
      error instanceof Error && !(error instanceof postgres.PostgresError)
        ? error.message
        : 'Database operation failed; inspect database diagnostics securely';
    console.error('❌ Migration failed:', message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  void runMigrations();
}
