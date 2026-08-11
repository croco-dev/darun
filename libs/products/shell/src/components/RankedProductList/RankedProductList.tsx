'use client';

import { AnalyticsEvents, track } from '@darun/analytics-client';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { ProductItem } from '../../uis';
import { useRankedProductList } from './useRankedProductList';

export const RankedProductList = bind(useRankedProductList, ({ products }) => (
  <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
    {products.map((product, index) => {
      const rank = index + 1;
      const isTopThree = rank <= 3;

      return (
        <Link
          key={product.id}
          href={`/products/${product.slug}?from=trending`}
          onClick={() =>
            track(AnalyticsEvents.RANKED_PRODUCT_CLICKED, {
              productSlug: product.slug,
              source: 'ranking',
            })
          }
          className="group block rounded-card border border-transparent p-3 transition-all hover:border-dark-150 hover:bg-white hover:shadow-card motion-reduce:transition-none"
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums ${
                isTopThree ? 'bg-dark-900 text-white' : 'bg-surface-100 text-dark-500'
              }`}
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
