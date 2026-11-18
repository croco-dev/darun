export function isCompleteLinkAddress(href: string) {
  if (!/^https?:\/\/[^/]/i.test(href) || /[\p{Cc}\s\\]/u.test(href)) return false;
  try {
    return Boolean(new URL(href).hostname);
  } catch {
    return false;
  }
}
