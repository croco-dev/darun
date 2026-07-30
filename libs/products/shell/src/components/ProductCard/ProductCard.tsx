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
  source: 'trending' | 'search-empty' | 'related' | 'recent';
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
      <div className="relative flex h-full flex-col rounded-2xl border border-surface-300 bg-white p-5 shadow-card transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-brand-400 group-hover:shadow-card-hover group-focus-visible:-translate-y-0.5 group-focus-visible:border-brand-400 group-focus-visible:shadow-card-hover group-focus-visible:ring-2 group-focus-visible:ring-brand-500/70 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-white active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none">
        {rank !== undefined && (
          <span className="absolute left-5 top-5 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-brand-100 px-2.5 text-xs font-bold text-brand-700 transition-transform duration-200 ease-out group-hover:scale-110 group-focus-visible:scale-110 motion-reduce:transform-none motion-reduce:transition-none md:h-9 md:min-w-9 md:px-3 md:text-sm">
            {rank}
          </span>
        )}
        <div
          className="pt-12 md:pt-14"
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
            isSummaryNoWrap
          />
        </div>
      </div>
    </Link>
  );
};
