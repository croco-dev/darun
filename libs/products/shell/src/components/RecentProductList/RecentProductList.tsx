'use client';

import { Sparkles } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { ProductCard } from '../ProductCard';
import { useRecentProductList } from './useRecentProductList';

export const RecentProductList = bind(useRecentProductList, ({ products, locale }) => {
  if (products.length === 0) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center rounded-card-lg border border-dark-150 bg-white px-6 py-10 text-center shadow-card">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-400 shadow-2xs">
          <Sparkles size={22} className="stroke-[2]" />
        </div>
        <p className="text-sm font-semibold text-dark-900 break-keep">
          {locale === 'ko' ? '최근 등록된 서비스가 없습니다' : 'No recently added services'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-5">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          href={`/${locale}/products/${product.slug}?from=recent`}
          source="recent"
        />
      ))}
    </div>
  );
});
