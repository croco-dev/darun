'use client';

import { ChevronRight } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { ProductItem, RankBadge, VoteCountBadge } from '../../uis';

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
      <div className="relative flex h-full flex-col justify-between rounded-card-lg border border-dark-150/90 bg-white p-4 shadow-card transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-dark-300 group-hover:shadow-card-hover group-focus-visible:-translate-y-0.5 group-focus-visible:border-dark-300 group-focus-visible:shadow-card-hover group-focus-visible:ring-2 group-focus-visible:ring-dark-900/60 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-white active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none sm:p-5">
        {rank !== undefined && (
          <div className="absolute right-3.5 top-3.5 z-10 sm:right-4 sm:top-4">
            <RankBadge rank={rank} size="sm" />
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
            tagVariant="square"
            maxTagItems={1}
            isStacked
            footerRight={
              product.voteCount !== undefined && product.voteCount !== null ? (
                <VoteCountBadge count={product.voteCount} />
              ) : (
                <span className="inline-flex items-center text-dark-300 transition-colors duration-200 ease-out group-hover:text-dark-700">
                  <ChevronRight
                    size={15}
                    className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
                  />
                </span>
              )
            }
          />
        </div>
      </div>
    </Link>
  );
};
