'use client';

import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { ProductItem } from '../../uis';
import { CompareButton } from '../CompareButton';
import type { ProductBySlugOnAlternativeProductListQuery } from './__generated__/useAlternativeProductList';
import { useAlternativeProductList } from './useAlternativeProductList';

type AlternativeProduct = NonNullable<
  ProductBySlugOnAlternativeProductListQuery['productBySlug']
>['alternatives'][number];
type Tag = AlternativeProduct['tags'][number];

type AlternativeProductListReturn = {
  slug: string;
  alternatives: AlternativeProduct[];
};

export const AlternativeProductList = bind(
  useAlternativeProductList,
  ({ alternatives }: AlternativeProductListReturn) => {
    if (alternatives.length === 0) {
      return null;
    }

    return (
      <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2">
        {alternatives.map((alternative: AlternativeProduct) => (
          <div
            key={alternative.id}
            className="flex items-center justify-between gap-4 rounded-card border border-dark-200 bg-white px-5 py-4 shadow-card transition-colors hover:border-dark-400 hover:shadow-card-hover motion-reduce:transition-none"
          >
            <Link href={`/products/${alternative.slug}?from=related`} className="flex-1 min-w-0">
              <ProductItem
                name={alternative.name}
                logoUrl={alternative.logoUrl}
                logoSize={'medium'}
                summary={alternative.summary}
                tags={alternative.tags.map((tag: Tag) => tag.name)}
              />
            </Link>
            <div className="flex-shrink-0">
              <CompareButton slug={alternative.slug} source="related" />
            </div>
          </div>
        ))}
      </div>
    );
  }
);
