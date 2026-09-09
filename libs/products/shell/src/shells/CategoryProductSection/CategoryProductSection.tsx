'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { Breadcrumb, Button, SectionWrapper } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { useLocale, useTranslations } from 'next-intl';
import { ProductCard } from '../../components';
import { getCategoryIcon } from '../CategoryNavigationSection/CategoryNavigationSection';

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
  const categoryIcon = getCategoryIcon(slug);

  return (
    <SectionWrapper background="white" spacing="md">
      <div className="flex flex-col gap-6 md:gap-8">
        <Breadcrumb
          items={[
            { label: locale === 'ko' ? '홈' : 'Home', href: `/${locale}/` },
            { label: categoryLabel, ariaCurrent: 'page' },
          ]}
        />

        <div className="flex items-start gap-4 sm:gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 shadow-2xs sm:h-14 sm:w-14">
            <span className="text-2xl leading-none sm:text-3xl">{categoryIcon}</span>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-dark-900 break-keep sm:text-3xl">
                {categoryLabel}
              </h1>
              {products.length > 0 && (
                <span className="inline-flex items-center rounded-md border border-dark-150 bg-surface-100 px-2.5 py-0.5 text-xs font-semibold text-dark-700">
                  {locale === 'ko' ? `${products.length}개 도구` : `${products.length} tools`}
                </span>
              )}
            </div>
            <p className="text-sm text-dark-600 break-keep sm:text-base">
              {locale === 'ko'
                ? `${categoryLabel} 분야의 추천 및 대안 소프트웨어를 탐색해보세요.`
                : `Discover recommended and alternative software in ${categoryLabel}.`}
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-card-lg border border-dark-150 bg-white px-6 py-14 text-center shadow-card sm:py-16">
            <div className="mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-2xl shadow-2xs">
              {categoryIcon}
            </div>
            <p className="text-base font-bold text-dark-900 sm:text-lg">{emptyLabel}</p>
            <p className="mt-1 max-w-sm text-sm text-dark-600 break-keep">
              {locale === 'ko'
                ? '아직 등록된 서비스가 없습니다. 다른 분야의 도구를 확인해보세요.'
                : 'No services registered yet. Explore tools in other categories.'}
            </p>
            <div className="mt-5">
              <Link href={`/${locale}/search/product`}>
                <Button variant="shadow" color="primary" size="md">
                  {locale === 'ko' ? '전체 도구 둘러보기' : 'Browse All Software'}
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-5">
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

