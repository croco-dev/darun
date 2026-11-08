import type postgres from 'postgres';
import { readFile } from 'node:fs/promises';

export function assertLocalPostgrestFixture(
  databaseUrl: string | undefined,
  restUrl: string | undefined,
  databaseName: string
) {
  if (!databaseUrl && !restUrl) return;
  if (!databaseUrl || !restUrl) throw new Error('PostgREST integration tests require both database and API URLs');

  const database = new URL(databaseUrl);
  const api = new URL(restUrl);
  if (
    !['localhost', '127.0.0.1'].includes(database.hostname) ||
    database.pathname !== `/${databaseName}` ||
    !['localhost', '127.0.0.1'].includes(api.hostname) ||
    api.protocol !== 'http:'
  ) {
    throw new Error(`PostgREST integration tests require local fixtures and the dedicated ${databaseName} database`);
  }
}

export const postgrestFixtureFetch: typeof fetch = (input, init) => {
  // Disposable fixtures expose PostgREST without Supabase's gateway or authentication.
  const url = new URL(String(input));
  url.pathname = url.pathname.replace(/^\/rest\/v1/, '');
  const headers = new Headers(init?.headers);
  headers.delete('authorization');
  headers.delete('apikey');
  return fetch(url, { ...init, headers, signal: AbortSignal.timeout(5000) });
};

export async function migrateTierPostgrestFixture(sql: postgres.Sql, restUrl: string) {
  const journal = JSON.parse(await readFile(new URL('../../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
  for (const { tag } of journal.entries) {
    const migration = await readFile(new URL(`../../drizzle/${tag}.sql`, import.meta.url), 'utf8');
    await sql.unsafe(`${migration};\nCOMMIT;`);
  }
  await sql`notify pgrst, 'reload schema'`;
  const deadline = Date.now() + 5000;
  while (true) {
    const response = await fetch(`${restUrl}/apps?select=id,tiers(tier),memos(content)`, {
      signal: AbortSignal.timeout(1000),
    });
    if (response.ok) return;
    if (Date.now() >= deadline) throw new Error(`PostgREST fixture not ready: ${response.status}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}
