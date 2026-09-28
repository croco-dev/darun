'use client';

import { Sparkles } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { useTranslations } from 'next-intl';
import { ProductCard } from '../ProductCard';
import { useRecentProductList } from './useRecentProductList';

export const RecentProductList = bind(useRecentProductList, ({ products, locale }) => {
  const t = useTranslations('home');

  if (products.length === 0) {
    return (
      <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-dark-200/80 bg-surface-50/50 px-6 py-10 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-500 shadow-2xs">
          <Sparkles size={22} className="stroke-[2] shrink-0" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-dark-900 break-words [word-break:keep-all]">{t('recent.empty')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-5">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          href={`/${locale}/products/${encodeURIComponent(product.slug)}?from=recent`}
          source="recent"
        />
      ))}
    </div>
  );
});
