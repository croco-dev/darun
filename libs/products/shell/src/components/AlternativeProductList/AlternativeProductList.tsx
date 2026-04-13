'use client';

import { bind } from '@croco/utils-structure-react';
import { Link } from '@darun/utils-router';
import { ProductItem } from '../../uis';
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
          <Link key={alternative.id} href={`/products/${alternative.slug}`}>
            <ProductItem
              name={alternative.name}
              logoUrl={alternative.logoUrl}
              logoSize={'medium'}
              summary={alternative.summary}
              tags={alternative.tags.map((tag: Tag) => tag.name)}
            />
          </Link>
        ))}
      </div>
    );
  }
);
