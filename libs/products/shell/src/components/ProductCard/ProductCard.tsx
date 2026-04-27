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
  source: 'trending' | 'search-empty' | 'related';
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
      <div className="relative flex h-full flex-col rounded-[20px] border border-surface-300 bg-white p-3.5 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.18)] transition-all duration-200 ease-out group-hover:-translate-y-1 group-hover:border-brand-300 group-hover:shadow-[0_22px_40px_-26px_rgba(53,63,174,0.28)] group-focus-visible:-translate-y-1 group-focus-visible:border-brand-300 group-focus-visible:shadow-[0_22px_40px_-26px_rgba(53,63,174,0.28)] group-focus-visible:ring-2 group-focus-visible:ring-brand-300/70 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-white active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none md:rounded-[24px] md:p-4">
        {rank !== undefined && (
          <span className="absolute left-3.5 top-3.5 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-brand-100 px-2.5 text-xs font-bold text-brand-700 transition-transform duration-200 ease-out group-hover:scale-105 group-focus-visible:scale-105 motion-reduce:transform-none motion-reduce:transition-none md:left-4 md:top-4 md:h-9 md:min-w-9 md:px-3 md:text-sm">
            {rank}
          </span>
        )}
        <div
          className="pt-10 transition-transform duration-200 ease-out group-hover:translate-y-0.5 group-focus-visible:translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none [&>div>div:last-child>div:last-child]:transition-transform [&>div>div:last-child>div:last-child]:duration-200 [&>div>div:last-child>div:last-child]:ease-out group-hover:[&>div>div:last-child>div:last-child]:translate-x-0.5 group-focus-visible:[&>div>div:last-child>div:last-child]:translate-x-0.5 motion-reduce:[&>div>div:last-child>div:last-child]:transform-none motion-reduce:[&>div>div:last-child>div:last-child]:transition-none md:pt-12"
          style={{
            viewTransitionName: layoutId ? `product-${layoutId}` : `product-${product.slug}`,
          }}
        >
          <ProductItem
            name={product.name}
            logoUrl={product.logoUrl ?? undefined}
            logoSize="small"
            summary={product.summary ?? undefined}
            tags={product.tags.map((tag) => tag.name)}
            maxTagItems={1}
            isSummaryNoWrap
          />
        </div>
      </div>
    </Link>
  );
};
