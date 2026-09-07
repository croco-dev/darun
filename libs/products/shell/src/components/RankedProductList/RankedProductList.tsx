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
          className="group block rounded-card-lg border border-dark-150/80 bg-white p-3.5 shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-dark-250 hover:shadow-card-hover motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums transition-all duration-200 ${
                  rank === 1
                    ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-white shadow-xs ring-1 ring-amber-400/50'
                    : rank === 2
                      ? 'bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-xs ring-1 ring-slate-400/40'
                      : rank === 3
                        ? 'bg-gradient-to-br from-amber-800 to-stone-900 text-amber-100 shadow-xs ring-1 ring-amber-700/40'
                        : 'border border-dark-150/70 bg-surface-100 text-dark-600 group-hover:border-dark-300 group-hover:bg-white group-hover:text-dark-900'
                } motion-reduce:transition-none`}
              >
                {rank}
              </span>
              <div className="min-w-0 flex-1">
                <ProductItem
                  name={product.name}
                  logoUrl={product.logoUrl}
                  logoSize="small"
                  summary={product.summary}
                  tags={product.tags.map(tag => tag.name)}
                  maxTagItems={1}
                />
              </div>
            </div>
            {product.voteCount !== undefined && product.voteCount !== null && (
              <div className="shrink-0 inline-flex items-center gap-1 rounded-full border border-dark-150/70 bg-surface-100/80 px-2.5 py-1 text-2xs font-semibold tabular-nums text-dark-700 transition-colors group-hover:border-cherry-200 group-hover:bg-cherry-50 group-hover:text-cherry-700">
                <svg
                  className="h-3 w-3 text-dark-400 transition-colors group-hover:text-cherry-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                <span>{product.voteCount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </Link>
      );
    })}
  </div>
));
