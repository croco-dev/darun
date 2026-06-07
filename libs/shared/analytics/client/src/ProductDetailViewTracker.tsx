'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { AnalyticsEvents } from './events';
import { track } from './posthog';

const VALID_SOURCES = ['trending', 'search', 'related', 'category', 'empty-stripe'] as const;

type Source = (typeof VALID_SOURCES)[number];

export function ProductDetailViewTracker({ productSlug }: { productSlug: string }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const from = searchParams.get('from');
    if (from && VALID_SOURCES.includes(from as Source)) {
      track(AnalyticsEvents.PRODUCT_DETAIL_VIEWED, {
        productSlug,
        source: from as Source,
      });
    }
  }, [productSlug, searchParams]);

  return null;
}
