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
  source: 'trending' | 'search-empty' | 'related' | 'recent' | 'search' | 'category';
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
      <div className="flex h-full flex-col gap-4 rounded-card border border-dark-200 bg-white p-5 shadow-card transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-dark-400 group-hover:shadow-card-hover group-focus-visible:-translate-y-0.5 group-focus-visible:border-dark-400 group-focus-visible:shadow-card-hover group-focus-visible:ring-2 group-focus-visible:ring-dark-900/70 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-white active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none">
        {rank !== undefined && (
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold leading-none tabular-nums text-dark-500 transition-colors duration-200 ease-out group-hover:text-dark-900 group-focus-visible:text-dark-900 motion-reduce:transition-none">
              {rank}
            </span>
            <span
              aria-hidden="true"
              className="h-px flex-1 bg-dark-200 transition-colors duration-200 ease-out group-hover:bg-dark-400 group-focus-visible:bg-dark-400 motion-reduce:transition-none"
            />
          </div>
        )}
        <div
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
            maxTagItems={1}
            isStacked
          />
        </div>
      </div>
    </Link>
  );
};
