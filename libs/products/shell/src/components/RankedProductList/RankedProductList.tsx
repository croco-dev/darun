'use client';

import { AnalyticsEvents, track } from '@darun/analytics-client';
import { Button, TrendingUp } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useTranslations } from 'next-intl';
import { ProductItem, VoteCountBadge } from '../../uis';
import { useRankedProductList } from './useRankedProductList';

export const RankedProductList = bind(useRankedProductList, ({ products, locale = 'ko' }) => {
  const t = useTranslations('Ranking');

  if (products.length === 0) {
    return (
      <div
        data-testid="ranking-empty"
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-dark-200/80 bg-surface-50/50 px-6 py-14 text-center sm:py-16"
      >
        <div className="mb-4 flex h-14 w-14 select-none items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-500 shadow-2xs">
          <TrendingUp size={24} className="shrink-0 stroke-[2]" aria-hidden="true" />
        </div>
        <p className="text-base font-extrabold tracking-tight text-dark-900 break-words [word-break:keep-all]">
          {t('empty.title')}
        </p>
        <p className="mt-1 max-w-sm text-sm text-dark-600 break-words [word-break:keep-all]">
          {t('empty.description')}
        </p>
        <Link
          href={`/${locale}/search/product`}
          className="mt-6 group inline-flex rounded-xl transition-transform active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
        >
          <Button as="span" variant="shadow" color="primary" size="md" className="motion-reduce:transition-none">
            <span className="select-none whitespace-nowrap">{t('empty.button')}</span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={t('section.title')}
      className="grid w-full grid-cols-1 gap-3.5 sm:gap-4 md:grid-cols-2"
    >
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
                ? 'border-dark-300 bg-white hover:border-dark-900'
                : rank === 2
                  ? 'border-dark-200 bg-white hover:border-dark-400'
                  : rank === 3
                    ? 'border-dark-200/90 bg-white hover:border-dark-300'
                    : 'border-dark-150/80 bg-white hover:border-dark-300'
            }`}
          >
            <div
              className="flex-1"
              style={{
                viewTransitionName: `ranking-product-${product.slug}`,
              }}
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
            </div>
          </Link>
        );
      })}
    </div>
  );
});
