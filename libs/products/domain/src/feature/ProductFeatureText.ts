export const PRODUCT_FEATURE_TEXT_LIMITS = {
  name: 100,
  summary: 255,
} as const;

export function isProductFeatureTextTooLong(field: keyof typeof PRODUCT_FEATURE_TEXT_LIMITS, value?: string | null) {
  if (!value) return false;

  const limit = PRODUCT_FEATURE_TEXT_LIMITS[field];
  // PostgreSQL varchar(n) counts Unicode code points, including supplementary characters.
  const characters = value[Symbol.iterator]();
  for (let count = 0; count <= limit; count += 1) {
    if (characters.next().done) return false;
  }
  return true;
}
