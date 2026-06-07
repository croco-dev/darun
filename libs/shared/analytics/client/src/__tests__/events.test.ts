import { describe, it, expect } from 'vitest';
import { AnalyticsEvents } from '../events';

describe('AnalyticsEvents constants', () => {
  it('should have the correct event names', () => {
    expect(AnalyticsEvents.SEARCH_PERFORMED).toBe('search_performed');
    expect(AnalyticsEvents.PRODUCT_DETAIL_VIEWED).toBe('product_detail_viewed');
    expect(AnalyticsEvents.CATEGORY_CHIP_CLICKED).toBe('category_chip_clicked');
    expect(AnalyticsEvents.EMPTY_SEARCH_STRIPE_CLICKED).toBe('empty_search_stripe_clicked');
    expect(AnalyticsEvents.RELATED_PRODUCT_CLICKED).toBe('related_product_clicked');
  });
});
