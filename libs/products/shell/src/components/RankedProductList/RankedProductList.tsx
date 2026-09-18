'use client';

import { AnalyticsEvents, track } from '@darun/analytics-client';
import { Button, TrendingUp } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { ProductItem, VoteCountBadge } from '../../uis';
import { useRankedProductList } from './useRankedProductList';

export const RankedProductList = bind(useRankedProductList, ({ products, locale = 'ko' }) => {
  if (products.length === 0) {
    return (
      <div
        data-testid="ranking-empty"
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-dark-200/80 bg-surface-50/50 px-6 py-14 text-center sm:py-16"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-dark-150/80 bg-gradient-to-br from-surface-50 to-surface-100 text-dark-500 shadow-2xs">
          <TrendingUp size={24} className="stroke-[2]" />
        </div>
        <p className="text-base font-extrabold tracking-tight text-dark-900 break-keep">집계된 랭킹 서비스가 없습니다</p>
        <p className="mt-1 max-w-sm text-sm text-dark-600 break-keep">
          아직 투표가 집계된 서비스가 없습니다. 다양한 서비스를 탐색하고 첫 번째 표를 남겨보세요!
        </p>
        <Link href={`/${locale}/search/product`} className="mt-6">
          <Button as="span" variant="shadow" color="primary" size="md" className="transition-all duration-200 active:scale-95">
            서비스 둘러보기
          </Button>
        </Link>
      </div>
    );
  }

  return (
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
            className={`group block rounded-card-lg border p-4 sm:p-5 shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 ${
              rank === 1
                ? 'border-amber-300/80 bg-gradient-to-br from-amber-50/70 via-white to-white hover:border-amber-400 hover:shadow-md'
                : rank === 2
                  ? 'border-slate-300/80 bg-gradient-to-br from-slate-50/60 via-white to-white hover:border-slate-400 hover:shadow-md'
                  : rank === 3
                    ? 'border-amber-600/30 bg-gradient-to-br from-orange-50/50 via-white to-white hover:border-orange-300 hover:shadow-md'
                    : 'border-dark-150/90 bg-white hover:border-dark-300'
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
  );
});
