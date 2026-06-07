'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { ContentArea } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { useLocale, useTranslations } from 'next-intl';
import { ProductItem } from '../../uis';

const PRODUCTS_BY_CATEGORY_QUERY = gql`
  query ProductsByCategoryOnSection($slug: String!, $locale: String!) {
    productsByCategory(slug: $slug, locale: $locale) {
      id
      name
      slug
      logoUrl
      summary
      voteCount
      tags {
        id
        name
      }
    }
  }
`;

type Product = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  summary?: string | null;
  voteCount: number;
  tags: Array<{
    id: string;
    name: string;
  }>;
};

type ProductsByCategoryQueryData = {
  productsByCategory?: Product[] | null;
};

export function CategoryProductSection({ slug }: { slug: string }) {
  const locale = useLocale();
  const t = useTranslations('Category');
  const { data } = useSuspenseQuery<ProductsByCategoryQueryData>(PRODUCTS_BY_CATEGORY_QUERY, {
    variables: {
      slug,
      locale,
    },
  });

  const products = data?.productsByCategory ?? [];
  const categoryLabel = t('title', { category: slug });
  const emptyLabel = t('empty');

  return (
    <ContentArea>
      <div className="flex flex-col gap-6">
        <h1 className="text-[22px] font-semibold tracking-[-0.2px] text-dark-800">{categoryLabel}</h1>
        {products.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center rounded-[24px] border border-surface-300 bg-surface-100 px-6 py-10 text-center text-sm font-medium text-dark-600 sm:text-base">
            {emptyLabel}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
            {products.map(product => (
              <Link
                key={product.id}
                href={`/products/${product.slug}?from=category`}
                className="group h-full focus-visible:outline-none"
              >
                <div className="relative flex h-full flex-col rounded-[20px] border border-surface-300 bg-white p-3.5 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.18)] transition-all duration-200 ease-out group-hover:-translate-y-1 group-hover:border-brand-300 group-hover:shadow-[0_22px_40px_-26px_rgba(53,63,174,0.28)] group-focus-visible:-translate-y-1 group-focus-visible:border-brand-300 group-focus-visible:shadow-[0_22px_40px_-26px_rgba(53,63,174,0.28)] group-focus-visible:ring-2 group-focus-visible:ring-brand-300/70 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-white active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none md:rounded-[24px] md:p-4">
                  <div className="transition-transform duration-200 ease-out group-hover:translate-y-0.5 group-focus-visible:translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none [&>div>div:last-child>div:last-child]:transition-transform [&>div>div:last-child>div:last-child]:duration-200 [&>div>div:last-child>div:last-child]:ease-out group-hover:[&>div>div:last-child>div:last-child]:translate-x-0.5 group-focus-visible:[&>div>div:last-child>div:last-child]:translate-x-0.5 motion-reduce:[&>div>div:last-child>div:last-child]:transform-none motion-reduce:[&>div>div:last-child>div:last-child]:transition-none">
                    <ProductItem
                      name={product.name}
                      logoUrl={product.logoUrl ?? undefined}
                      logoSize="small"
                      summary={product.summary ?? undefined}
                      tags={product.tags.map(tag => tag.name)}
                      maxTagItems={2}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ContentArea>
  );
}
