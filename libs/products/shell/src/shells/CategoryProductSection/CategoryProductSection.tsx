'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { PageHeading, SectionWrapper } from '@darun/ui';
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
    categories(first: 100, locale: $locale) {
      id
      slug
      labelKo
      labelEn
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

type Category = {
  id: string;
  slug: string;
  labelKo: string;
  labelEn: string;
};

type ProductsByCategoryQueryData = {
  productsByCategory?: Product[] | null;
  categories?: Category[] | null;
};

export function CategoryProductSection({ slug }: { slug: string }) {
  const locale = useLocale();
  const t = useTranslations('category');
  const { data } = useSuspenseQuery<ProductsByCategoryQueryData>(PRODUCTS_BY_CATEGORY_QUERY, {
    variables: {
      slug,
      locale,
    },
  });

  const products = data?.productsByCategory ?? [];
  const category = (data?.categories ?? []).find(c => c.slug === slug);
  const categoryLabel = category ? (locale === 'ko' ? category.labelKo : category.labelEn) : '';
  const emptyLabel = t('empty');

  return (
    <SectionWrapper background="white" spacing="md">
      <div className="flex flex-col gap-5 md:gap-6">
        <PageHeading title={categoryLabel} />
        {products.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center rounded-card-lg border border-dark-200 bg-surface-100 px-6 py-10 text-center text-sm font-medium text-dark-600 sm:text-base">
            {emptyLabel}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:gap-5">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                href={`/${locale}/products/${product.slug}?from=category`}
                source="category"
              />
            ))}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
