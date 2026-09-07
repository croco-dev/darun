'use client';

import { AnalyticsEvents, track } from '@darun/analytics-client';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { ProductItem, VoteCountBadge } from '../../uis';
import { useRankedProductList } from './useRankedProductList';

export const RankedProductList = bind(useRankedProductList, ({ products, locale = 'ko' }) => (
  <div className="grid w-full grid-cols-1 gap-3.5 sm:gap-4 md:grid-cols-2">
    {products.map((product, index) => {
      const rank = index + 1;

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
          className={`group block rounded-card-lg border p-4 sm:p-5 shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 ${
            rank === 1
              ? 'border-amber-300 bg-gradient-to-br from-amber-50/40 via-white to-white hover:border-amber-400'
              : rank === 2
                ? 'border-slate-300 bg-gradient-to-br from-slate-50/30 via-white to-white hover:border-slate-400'
                : rank === 3
                  ? 'border-amber-200 bg-gradient-to-br from-amber-50/20 via-white to-white hover:border-amber-300'
                  : 'border-dark-150 bg-white hover:border-dark-250'
          }`}
        >
          <ProductItem
            name={product.name}
            logoUrl={product.logoUrl}
            logoSize="small"
            summary={product.summary}
            tags={product.tags.map(tag => tag.name)}
            rank={rank}
            headerRight={
              product.voteCount !== undefined && product.voteCount !== null ? (
                <VoteCountBadge count={product.voteCount} />
              ) : null
            }
            isRanked
          />
        </Link>
      );
    })}
  </div>
));
