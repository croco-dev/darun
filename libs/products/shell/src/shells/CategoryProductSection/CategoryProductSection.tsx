'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { SectionHeader, SectionWrapper } from '@darun/ui';
import { useLocale, useTranslations } from 'next-intl';
import { ProductCard } from '../../components';

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
    <SectionWrapper background="white" spacing="md">
      <div className="flex flex-col gap-5 md:gap-6">
        <SectionHeader title={categoryLabel} />
        {products.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center rounded-card-lg border border-dark-200 bg-surface-100 px-6 py-10 text-center text-sm font-medium text-dark-600 sm:text-base">
            {emptyLabel}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                href={`/products/${product.slug}?from=category`}
                source="category"
              />
            ))}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
