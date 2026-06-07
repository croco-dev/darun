'use client';

import { bind } from '@croco/utils-structure-react';
import { Link } from '@darun/utils-router';
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
            className="flex items-center justify-between gap-4 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-[18px] py-4 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)] hover:border-brand-300 transition-colors"
          >
            <Link href={`/products/${alternative.slug}`} className="flex-1 min-w-0">
              <ProductItem
                name={alternative.name}
                logoUrl={alternative.logoUrl}
                logoSize={'medium'}
                summary={alternative.summary}
                tags={alternative.tags.map((tag: Tag) => tag.name)}
              />
            </Link>
            <div className="flex-shrink-0">
              <CompareButton slug={alternative.slug} />
            </div>
          </div>
        ))}
      </div>
    );
  }
);
