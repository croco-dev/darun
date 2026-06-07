'use client';

import { bind } from '@croco/utils-structure-react';
import { Link } from '@darun/utils-router';
import { ProductItem } from '../../uis';
import { useRankedProductList } from './useRankedProductList';

export const RankedProductList = bind(useRankedProductList, ({ products }) => (
  <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2">
    {products.map((product, index) => (
      <Link key={product.id} href={`/products/${product.slug}?from=trending`}>
        <div className="flex items-center gap-3">
          <p className="min-w-7 text-center text-[18px] font-bold text-dark-400">{index + 1}</p>
          <ProductItem
            name={product.name}
            logoUrl={product.logoUrl}
            logoSize={'medium'}
            summary={product.summary}
            tags={product.tags.map(tag => tag.name)}
            maxTagItems={2}
          />
        </div>
      </Link>
    ))}
  </div>
));
