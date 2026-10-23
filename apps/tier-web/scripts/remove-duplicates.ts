import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { cleanDuplicateApps } from './duplicate-cleanup';

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && !['--apply', '--dry-run'].includes(args[0]))) {
    throw new Error('Usage: remove-duplicates.ts [--dry-run | --apply]');
  }
  dotenv.config({ quiet: true });
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const client = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    const apply = args[0] === '--apply';
    const groups = await cleanDuplicateApps(drizzle(client), apply);
    // Publish applied results only after the transaction has committed.
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', groups }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch(error => {
  // Do not expose connection strings or driver query parameters on failure.
  console.error(
    error instanceof Error && error.message.startsWith('Usage:')
      ? error.message
      : 'Duplicate cleanup failed; no successful result was confirmed.'
  );
  process.exitCode = 1;
});
