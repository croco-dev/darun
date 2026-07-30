import { describe, it, expect } from 'vitest';
import { AnalyticsEvents, normalizeProductAttributionSource } from '../events';

describe('AnalyticsEvents constants', () => {
  it('should have the correct event names', () => {
    expect(AnalyticsEvents.SEARCH_PERFORMED).toBe('search_performed');
    expect(AnalyticsEvents.PRODUCT_DETAIL_VIEWED).toBe('product_detail_viewed');
    expect(AnalyticsEvents.CATEGORY_CHIP_CLICKED).toBe('category_chip_clicked');
    expect(AnalyticsEvents.EMPTY_SEARCH_STRIPE_CLICKED).toBe('empty_search_stripe_clicked');
    expect(AnalyticsEvents.RELATED_PRODUCT_CLICKED).toBe('related_product_clicked');
    expect(AnalyticsEvents.RANKED_PRODUCT_CLICKED).toBe('ranked_product_clicked');
    expect(AnalyticsEvents.COMPARE_CTA_CLICKED).toBe('compare_cta_clicked');
  });
});

describe('normalizeProductAttributionSource', () => {
  it('should return the source as-is for valid discovery sources', () => {
    expect(normalizeProductAttributionSource('search')).toBe('search');
    expect(normalizeProductAttributionSource('trending')).toBe('trending');
    expect(normalizeProductAttributionSource('related')).toBe('related');
    expect(normalizeProductAttributionSource('category')).toBe('category');
    expect(normalizeProductAttributionSource('empty-stripe')).toBe('empty-stripe');
    expect(normalizeProductAttributionSource('recent')).toBe('recent');
  });

  it('should return "direct" for null, undefined, or empty string', () => {
    expect(normalizeProductAttributionSource(null)).toBe('direct');
    expect(normalizeProductAttributionSource(undefined)).toBe('direct');
    expect(normalizeProductAttributionSource('')).toBe('direct');
  });

  it('should return "direct" for invalid source values', () => {
    expect(normalizeProductAttributionSource('invalid')).toBe('direct');
  });
});
