"use client";

import { Link } from "@darun/utils-router";
import { ProductItem, VoteCountBadge } from "../../uis";

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
  source:
    | "trending"
    | "search-empty"
    | "related"
    | "recent"
    | "search"
    | "category"
    | "compare";
  layoutId?: string;
  onClick?: () => void;
};

export const ProductCard = ({
  product,
  rank,
  href,
  source,
  layoutId,
  onClick,
}: ProductCardProps) => {
  return (
    <Link
      key={product.id}
      href={href}
      className="group relative h-full focus-visible:outline-none"
      onClick={onClick}
      {...(layoutId ? { "data-layout-id": layoutId } : {})}
      {...{ "data-source": source }}
    >
      <div className="relative flex h-full flex-col justify-between rounded-card-lg border border-dark-150 bg-white p-4 shadow-card transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-dark-300 group-hover:shadow-card-hover group-focus-visible:-translate-y-0.5 group-focus-visible:border-dark-300 group-focus-visible:shadow-card-hover group-focus-visible:ring-2 group-focus-visible:ring-dark-900/60 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-white active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none sm:p-5">
        {rank !== undefined && (
          <div className="absolute right-3.5 top-3.5 z-10 sm:right-4 sm:top-4">
            <span
              className={`flex h-6 min-w-6 items-center justify-center rounded-lg px-2 text-xs font-bold tabular-nums transition-colors duration-200 ease-out motion-reduce:transition-none ${
                rank === 1
                  ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xs ring-1 ring-amber-400/40"
                  : rank === 2
                    ? "bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-xs ring-1 ring-slate-500/30"
                    : rank === 3
                      ? "bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 shadow-xs ring-1 ring-amber-700/30"
                      : "border border-dark-150 bg-surface-100 font-bold text-dark-600 group-hover:border-dark-300 group-hover:bg-white group-hover:text-dark-900"
              }`}
            >
              {rank}
            </span>
          </div>
        )}
        <div
          className="flex-1"
          style={{
            viewTransitionName: layoutId
              ? `product-${layoutId}`
              : `product-${product.slug}`,
          }}
        >
          <ProductItem
            name={product.name}
            logoUrl={product.logoUrl ?? undefined}
            logoSize="small"
            summary={product.summary ?? undefined}
            tags={product.tags.map((tag) => tag.name)}
            tagVariant="circle"
            maxTagItems={1}
            isStacked
            footerRight={
              product.voteCount !== undefined && product.voteCount !== null ? (
                <VoteCountBadge count={product.voteCount} />
              ) : (
                <span className="inline-flex items-center text-dark-300 transition-colors duration-200 ease-out group-hover:text-dark-700">
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
