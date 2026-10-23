export function normalizeSearchQuery(query: string | string[] | undefined): string {
  if (!query) return '';
  const resolvedQuery = Array.isArray(query) ? (query.find(Boolean) ?? '') : query;
  return resolvedQuery.trim();
}
