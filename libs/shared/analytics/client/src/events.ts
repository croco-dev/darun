export const AnalyticsEvents = {
  PRODUCT_DETAIL_VIEWED: 'product_detail_viewed',
  SEARCH_PERFORMED: 'search_performed',
  CATEGORY_CHIP_CLICKED: 'category_chip_clicked',
  EMPTY_SEARCH_STRIPE_CLICKED: 'empty_search_stripe_clicked',
  RELATED_PRODUCT_CLICKED: 'related_product_clicked',
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
