'use client';

import { Link } from '@darun/utils-router';
import { ProductItem } from '../../uis';

type ProductFragment = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  summary?: string | null;
  voteCount?: number | null;
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
      className="group relative h-full focus-visible:outline-none"
      onClick={onClick}
      {...(layoutId ? { 'data-layout-id': layoutId } : {})}
      {...{ 'data-source': source }}
    >
      <div className="relative flex h-full flex-col justify-between rounded-card-lg border border-dark-150/80 bg-white p-4 shadow-card transition-all duration-200 ease-out group-hover:-translate-y-1 group-hover:border-dark-300 group-hover:shadow-card-hover group-focus-visible:-translate-y-1 group-focus-visible:border-dark-300 group-focus-visible:shadow-card-hover group-focus-visible:ring-2 group-focus-visible:ring-dark-900/60 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-white active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none sm:p-4.5">
        {rank !== undefined && (
          <div className="absolute right-3.5 top-3.5 z-10 sm:right-4 sm:top-4">
            <span
              className={`flex h-6 min-w-6 items-center justify-center rounded-lg px-2 text-2xs font-extrabold tabular-nums transition-transform duration-200 ease-out group-hover:scale-105 motion-reduce:transition-none ${
                rank === 1
                  ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xs ring-1 ring-amber-400/40'
                  : rank === 2
                    ? 'bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-xs ring-1 ring-slate-500/30'
                    : rank === 3
                      ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 shadow-xs ring-1 ring-amber-700/30'
                      : 'border border-dark-150/70 bg-surface-100 font-bold text-dark-600 group-hover:border-dark-300 group-hover:bg-white group-hover:text-dark-900'
              }`}
            >
              {rank}
            </span>
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
            footerRight={
              product.voteCount !== undefined && product.voteCount !== null ? (
                <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dark-150/70 bg-surface-100/80 px-2.5 py-0.5 text-2xs font-semibold tabular-nums text-dark-700 transition-colors group-hover:border-cherry-200 group-hover:bg-cherry-50 group-hover:text-cherry-700">
                  <svg
                    className="h-3 w-3 text-dark-400 transition-colors group-hover:text-cherry-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  <span>{product.voteCount.toLocaleString()}</span>
                </div>
              ) : (
                <span className="inline-flex items-center text-dark-300 transition-all duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-dark-700">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </span>
              )
            }
          />
        </div>
      </div>
    </Link>
  );
};
