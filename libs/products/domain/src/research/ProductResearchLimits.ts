export const PRODUCT_RESEARCH_FEATURE_SUMMARY_MAX_LENGTH = 255;
export const PRODUCT_RESEARCH_MAX_TAGS = 10;

export function normalizeResearchTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  return tags
    .map(tag => tag.trim().replace(/\s+/g, ' '))
    .filter(tag => {
      const key = tag.toLowerCase();
      if (!tag || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function normalizeResearchFeatureSummary(summary: string): string {
  return summary.trim().replace(/\s+/g, ' ');
}
