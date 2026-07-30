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
      <div className="relative flex h-full flex-col border border-surface-300 bg-white p-5 transition-colors duration-200 ease-out group-hover:border-brand-400 group-focus-visible:border-brand-400 group-focus-visible:ring-2 group-focus-visible:ring-brand-500/70 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-white motion-reduce:transition-none">
        {rank !== undefined && (
          <span
            aria-label={`rank ${rank}`}
            className="absolute right-4 top-3 select-none font-bold leading-none tracking-tightest text-surface-300 transition-colors duration-200 ease-out group-hover:text-brand-300 group-focus-visible:text-brand-300 motion-reduce:transition-none"
            style={{ fontSize: '2.25rem' }}
          >
            {rank}
          </span>
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
            isSummaryNoWrap
          />
        </div>
      </div>
    </Link>
  );
};