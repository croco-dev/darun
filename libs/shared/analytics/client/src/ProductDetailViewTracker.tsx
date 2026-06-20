'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { AnalyticsEvents, normalizeProductAttributionSource } from './events';
import { track } from './posthog';

export function ProductDetailViewTracker({ productSlug }: { productSlug: string }) {
  const searchParams = useSearchParams();
  const emittedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const from = searchParams.get('from');
    const source = normalizeProductAttributionSource(from);
    const key = `${productSlug}:${source}`;

    if (!emittedRef.current.has(key)) {
      emittedRef.current.add(key);
      track(AnalyticsEvents.PRODUCT_DETAIL_VIEWED, {
        productSlug,
        source,
      });
    }
  }, [productSlug, searchParams]);

  return null;
}
