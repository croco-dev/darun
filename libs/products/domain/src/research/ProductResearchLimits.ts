export const PRODUCT_RESEARCH_FEATURE_SUMMARY_MAX_LENGTH = 255;

export function normalizeResearchFeatureSummary(summary: string): string {
  return summary.trim().replace(/\s+/g, ' ');
}
