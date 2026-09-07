'use client';

import type { ProductBySlugOnAlternativeProductListQuery } from '@darun/provider-graphql';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { ProductItem } from '../../uis';
import { CompareButton } from '../CompareButton';
import { useAlternativeProductList } from './useAlternativeProductList';

type AlternativeProduct = NonNullable<
  ProductBySlugOnAlternativeProductListQuery['productBySlug']
>['alternatives'][number];
type Tag = AlternativeProduct['tags'][number];

type AlternativeProductListReturn = {
  slug: string;
  alternatives: AlternativeProduct[];
  locale?: string;
};

export const AlternativeProductList = bind(
  useAlternativeProductList,
  ({ alternatives, locale = 'ko' }: AlternativeProductListReturn) => {
    if (alternatives.length === 0) {
      return null;
    }

    return (
      <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {alternatives.map((alternative: AlternativeProduct) => (
          <div
            key={alternative.id}
            className="flex items-center justify-between gap-4 rounded-card border border-dark-150 bg-white px-4 py-4 shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-dark-300 hover:shadow-card-hover motion-reduce:transform-none motion-reduce:transition-none"
          >
            <Link href={`/${locale}/products/${alternative.slug}?from=related`} className="min-w-0 flex-1">
              <ProductItem
                name={alternative.name}
                logoUrl={alternative.logoUrl}
                logoSize="small"
                summary={alternative.summary}
                tags={alternative.tags.map((tag: Tag) => tag.name)}
                maxTagItems={1}
              />
            </Link>
            <div className="shrink-0">
              <CompareButton slug={alternative.slug} source="related" />
            </div>
          </div>
        ))}
      </div>
    );
  }
);
