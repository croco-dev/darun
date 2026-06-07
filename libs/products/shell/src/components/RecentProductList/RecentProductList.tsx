'use client';

import { bind } from '@croco/utils-structure-react';
import { Link } from '@darun/utils-router';
import { ProductItem } from '../../uis';
import { useRecentProductList } from './useRecentProductList';

export const RecentProductList = bind(useRecentProductList, ({ products }) => (
  <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
    {products.map(product => (
      <Link
        key={product.id}
        href={`/products/${product.slug}?from=trending`}
        className="group block rounded-[20px] border border-surface-300 bg-white p-3.5 shadow-[var(--home-shadow-card)] transition-all duration-200 ease-out hover:-translate-y-1 hover:border-brand-300 hover:shadow-[0_28px_44px_-30px_rgba(53,63,174,0.3)] focus-visible:-translate-y-1 focus-visible:border-brand-300 focus-visible:shadow-[0_28px_44px_-30px_rgba(53,63,174,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--home-bg-section-alt)] active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none md:rounded-3xl md:p-5"
      >
        <div className="transition-transform duration-200 ease-out group-hover:translate-y-0.5 group-focus-visible:translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none [&>div>div:last-child>div:last-child]:transition-transform [&>div>div:last-child>div:last-child]:duration-200 [&>div>div:last-child>div:last-child]:ease-out group-hover:[&>div>div:last-child>div:last-child]:translate-x-0.5 group-focus-visible:[&>div>div:last-child>div:last-child]:translate-x-0.5 motion-reduce:[&>div>div:last-child>div:last-child]:transform-none motion-reduce:[&>div>div:last-child>div:last-child]:transition-none">
          <ProductItem
            name={product.name}
            logoUrl={product.logoUrl}
            logoSize={'small'}
            summary={product.summary}
            tags={product.tags.map(tag => tag.name)}
            maxTagItems={1}
            isSummaryNoWrap
          />
        </div>
      </Link>
    ))}
  </div>
));
