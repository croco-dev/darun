'use client';

import { bind } from '@croco/utils-structure-react';
import { Link } from '@darun/utils-router';
import { ProductItem } from '../../uis';
import { useRecentProductList } from './useRecentProductList';

export const RecentProductList = bind(useRecentProductList, ({ products }) => (
  <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
    {products.map((product) => (
      <Link
        key={product.id}
        href={`/products/${product.slug}`}
        className="block rounded-3xl border border-surface-300 bg-white p-5 shadow-[var(--home-shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
      >
        <ProductItem
          name={product.name}
          logoUrl={product.logoUrl}
          logoSize={'medium'}
          summary={product.summary}
          tags={product.tags.map((tag) => tag.name)}
          maxTagItems={2}
        />
      </Link>
    ))}
  </div>
));
