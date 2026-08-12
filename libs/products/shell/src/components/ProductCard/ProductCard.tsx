'use client';

import { Link } from '@darun/utils-router';
import { ProductItem } from '../../uis';

type ProductFragment = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  summary?: string | null;
  tags: Array<{
    id: string;
    name: string;
  }>;
};

type ProductCardProps = {
  product: ProductFragment;
  rank?: number;
  href: string;
  source: 'trending' | 'search-empty' | 'related' | 'recent' | 'search' | 'category' | 'compare';
  layoutId?: string;
  onClick?: () => void;
};

export const ProductCard = ({ product, rank, href, source, layoutId, onClick }: ProductCardProps) => {
  return (
    <Link
      key={product.id}
      href={href}
      className="group h-full focus-visible:outline-none"
      onClick={onClick}
      {...(layoutId ? { 'data-layout-id': layoutId } : {})}
      {...{ 'data-source': source }}
    >
      <div className="flex h-full flex-col gap-4 rounded-card border border-dark-150 bg-white p-4 shadow-card transition-all duration-200 ease-out-expo group-hover:-translate-y-1 group-hover:border-dark-200 group-hover:shadow-card-hover group-focus-visible:-translate-y-1 group-focus-visible:border-dark-200 group-focus-visible:shadow-card-hover group-focus-visible:ring-2 group-focus-visible:ring-dark-900/60 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-white active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none md:gap-5 md:p-5">
        {rank !== undefined && (
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-dark-900 text-2xs font-bold tabular-nums text-white transition-colors duration-200 ease-out group-hover:bg-brown-600 motion-reduce:transition-none">
              {rank}
            </span>
            <span
              aria-hidden="true"
              className="h-px flex-1 bg-dark-100 transition-colors duration-200 ease-out group-hover:bg-dark-150 group-focus-visible:bg-dark-150 motion-reduce:transition-none"
            />
          </div>
        )}
        <div
          className="flex-1"
          style={{
            viewTransitionName: layoutId ? `product-${layoutId}` : `product-${product.slug}`,
          }}
        >
          <ProductItem
            name={product.name}
            logoUrl={product.logoUrl ?? undefined}
            logoSize="small"
            summary={product.summary ?? undefined}
            tags={product.tags.map(tag => tag.name)}
            tagVariant="circle"
            maxTagItems={1}
            isStacked
          />
        </div>
      </div>
    </Link>
  );
};
