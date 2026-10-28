// Drizzle wraps postgres-js errors in `cause`; node-postgres uses `constraint`.
// Match the migrated slug constraint, not every unique violation in a transaction.
export function isProductSlugConflict(error: unknown): boolean {
  const seen = new Set<object>();
  let current = error;
  for (let depth = 0; depth < 8 && typeof current === 'object' && current !== null; depth += 1) {
    if (seen.has(current)) return false;
    seen.add(current);
    const pg = current as {
      code?: unknown;
      constraint_name?: unknown;
      constraint?: unknown;
      cause?: unknown;
    };
    if (pg.code === '23505' && (pg.constraint_name ?? pg.constraint) === 'products_slug_unique') return true;
    current = pg.cause;
  }
  return false;
}
