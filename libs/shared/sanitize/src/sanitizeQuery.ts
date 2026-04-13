const QUERY_MAX_LENGTH = 50;

export function sanitizeQuery(query: string): string {
  let sanitized = query.replace(/<[^>]*>/g, "");
  sanitized = sanitized.replace(/[<>'"&]/g, "");
  if (sanitized.length > QUERY_MAX_LENGTH) {
    sanitized = sanitized.slice(0, QUERY_MAX_LENGTH - 3) + "...";
  }
  return sanitized.trim();
}
