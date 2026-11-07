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
