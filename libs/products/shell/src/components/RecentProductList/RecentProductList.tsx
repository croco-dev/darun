'use client';

import { bind } from '@darun/utils-structure-react';
import { ProductCard } from '../ProductCard';
import { useRecentProductList } from './useRecentProductList';

export const RecentProductList = bind(useRecentProductList, ({ products, locale }) => {
  if (products.length === 0) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center rounded-card-lg border border-dark-150 bg-white px-6 py-10 text-center shadow-card">
        <span className="mb-2 text-2xl" aria-hidden="true">✨</span>
        <p className="text-sm font-semibold text-dark-900 break-keep">최근 등록된 서비스가 없습니다</p>
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
