export const AnalyticsEvents = {
  PRODUCT_DETAIL_VIEWED: 'product_detail_viewed',
  SEARCH_PERFORMED: 'search_performed',
  CATEGORY_CHIP_CLICKED: 'category_chip_clicked',
  EMPTY_SEARCH_STRIPE_CLICKED: 'empty_search_stripe_clicked',
  RELATED_PRODUCT_CLICKED: 'related_product_clicked',
  RANKED_PRODUCT_CLICKED: 'ranked_product_clicked',
  COMPARE_CTA_CLICKED: 'compare_cta_clicked',
} as const;

export type ProductDetailViewedPayload = {
  productSlug: string;
  source: 'trending' | 'search' | 'related' | 'category' | 'empty-stripe';
};

export type SearchPerformedPayload = {
  query: string;
  resultCount: number;
};

export type CategoryChipClickedPayload = {
  categorySlug: string;
  source: 'home-bar' | 'empty-grid';
};

export type EmptySearchStripeClickedPayload = {
  queryText: string;
};

export type RelatedProductClickedPayload = {
  fromSlug: string;
  toSlug: string;
  position: number;
};

export type RankedProductClickedPayload = {
  productSlug: string;
  source: 'ranking' | 'trending' | 'search-empty-trending';
};

export type ProductDiscoverySource = 'trending' | 'search' | 'related' | 'category' | 'empty-stripe';

export type ProductAttributionSource = ProductDiscoverySource | 'direct';

export function normalizeProductAttributionSource(rawFrom: string | null | undefined): ProductAttributionSource {
  if (
    rawFrom === 'trending' ||
    rawFrom === 'search' ||
    rawFrom === 'related' ||
    rawFrom === 'category' ||
    rawFrom === 'empty-stripe'
  ) {
    return rawFrom;
  }
  return 'direct';
}

export type CompareCtaClickedPayload = {
  productSlug: string;
  action: 'add' | 'remove' | 'navigate';
  source: ProductAttributionSource;
  compareCount: number;
  targetSlug?: string;
};
