'use client';

import { bind } from '@croco/utils-structure-react';
import { Link } from '@darun/utils-router';
import { ProductItem } from '../../uis';
import { useRecentProductList } from './useRecentProductList';

export const RecentProductList = bind(useRecentProductList, ({ products }) => (
  <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2">
    {products.map(product => (
      <Link key={product.id} href={`/products/${product.slug}`}>
        <ProductItem
          name={product.name}
          logoUrl={product.logoUrl}
          logoSize={'medium'}
          summary={product.summary}
          tags={product.tags.map(tag => tag.name)}
          maxTagItems={2}
        />
      </Link>
    ))}
  </div>
));
