'use client';

import { AnalyticsEvents, track } from '@darun/analytics-client';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { ProductItem } from '../../uis';
import { useRankedProductList } from './useRankedProductList';

export const RankedProductList = bind(useRankedProductList, ({ products, locale = 'ko' }) => (
  <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
    {products.map((product, index) => {
      const rank = index + 1;
      const isTopThree = rank <= 3;

      return (
        <Link
          key={product.id}
          href={`/${locale}/products/${product.slug}?from=trending`}
          onClick={() =>
            track(AnalyticsEvents.RANKED_PRODUCT_CLICKED, {
              productSlug: product.slug,
              source: 'ranking',
            })
          }
          className="group block rounded-card border border-dark-150/70 bg-white/70 p-3 transition-all duration-200 ease-out hover:-translate-y-px hover:border-dark-200 hover:bg-white hover:shadow-card motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums transition-colors duration-200 ${
                rank === 1
                  ? 'bg-yellow-600 text-white group-hover:bg-yellow-700 shadow-sm'
                  : rank === 2
                    ? 'bg-dark-800 text-white group-hover:bg-dark-900 shadow-sm'
                    : rank === 3
                      ? 'bg-brown-600 text-white group-hover:bg-brown-700 shadow-sm'
                      : 'bg-surface-100 text-dark-500 group-hover:bg-dark-100'
              } motion-reduce:transition-none`}
            >
              {rank}
            </span>
            <ProductItem
              name={product.name}
              logoUrl={product.logoUrl}
              logoSize="small"
              summary={product.summary}
              tags={product.tags.map(tag => tag.name)}
              maxTagItems={1}
            />
          </div>
        </Link>
      );
    })}
  </div>
));
