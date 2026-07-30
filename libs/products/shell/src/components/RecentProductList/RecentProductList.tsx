'use client';

import { bind } from '@darun/utils-structure-react';
import { ProductCard } from '../ProductCard';
import { useRecentProductList } from './useRecentProductList';

export const RecentProductList = bind(useRecentProductList, ({ products, locale }) => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
    {products.map(product => (
      <ProductCard
        key={product.id}
        product={product}
        href={`/${locale}/products/${product.slug}?from=recent`}
        source="recent"
      />
    ))}
  </div>
));
