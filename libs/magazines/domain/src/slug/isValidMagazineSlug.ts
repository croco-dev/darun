export function isValidMagazineSlug(slug: string): boolean {
  if (typeof slug !== 'string') return false;
  const value = slug.trim();
  return value.length > 0 && value !== '.' && value !== '..';
}
