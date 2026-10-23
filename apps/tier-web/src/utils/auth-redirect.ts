export function getAuthRedirect(next: string | null, origin: string): URL {
  const fallback = new URL('/', origin);
  if (!next || !next.startsWith('/') || next.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    const decoded = decodeURIComponent(next);
    if (decoded.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(decoded)) return fallback;
    const destination = new URL(next, origin);
    return destination.origin === fallback.origin && !destination.username && !destination.password
      ? destination
      : fallback;
  } catch {
    return fallback;
  }
}
