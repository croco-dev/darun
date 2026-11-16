import type { ReviewedResearchFeature } from '../repositories/ProductResearchMaterializationRepository';

export { normalizeResearchRequestUrl } from './ProductResearchUrl';

export const PRODUCT_RESEARCH_FEATURE_NAME_MAX_LENGTH = 100;
export const PRODUCT_RESEARCH_FEATURE_SUMMARY_MAX_LENGTH = 255;
export const PRODUCT_RESEARCH_FEATURE_EMOJI_MAX_LENGTH = 30;
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

export function inspectReviewedResearchFeature(feature: ReviewedResearchFeature) {
  const name = feature.name.trim().replace(/\s+/g, ' ');
  const summary = normalizeResearchFeatureSummary(feature.summary);
  const emoji = (feature.emoji || '✨').trim() || '✨';
  return {
    feature: { name, summary, emoji },
    invalidName: !name || name.length > PRODUCT_RESEARCH_FEATURE_NAME_MAX_LENGTH,
    missingSummary: !summary,
    summaryTooLong: summary.length > PRODUCT_RESEARCH_FEATURE_SUMMARY_MAX_LENGTH,
    emojiTooLong: emoji.length > PRODUCT_RESEARCH_FEATURE_EMOJI_MAX_LENGTH,
  };
}
