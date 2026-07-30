'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { AnalyticsEvents, track } from '@darun/analytics-client';
import { SectionHeader, SectionWrapper } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { useLocale, useTranslations } from 'next-intl';

const CATEGORIES_QUERY = gql`
  query CategoriesOnCategoryNavigationSection($first: Int!, $locale: String!) {
    categories(first: $first, locale: $locale) {
      id
      slug
      labelKo
      labelEn
    }
  }
`;

type Category = { id: string; slug: string; labelKo: string; labelEn: string };
type CategoriesQueryResult = { categories?: Category[] | null };

export const CategoryNavigationSection = () => {
  const t = useTranslations();
  const locale = useLocale();
  const { data } = useSuspenseQuery<CategoriesQueryResult>(CATEGORIES_QUERY, {
    variables: { first: 8, locale },
  });

  const categories = (data?.categories ?? []).slice(0, 8);

  return (
    <SectionWrapper background="white" spacing="md">
      <div className="flex w-full flex-col gap-5 md:gap-6">
        <SectionHeader
          title={t('home.category.title')}
          moreLink={
            <Link
              href={`/${locale}/search/product`}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 transition-colors duration-200 ease-out hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:transition-none"
            >
              {t('home.category.more')}
            </Link>
          }
        />
        {categories.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {categories.map(category => (
              <Link
                key={category.id}
                href={`/${locale}/categories/${category.slug}`}
                onClick={() =>
                  track(AnalyticsEvents.CATEGORY_CHIP_CLICKED, {
                    categorySlug: category.slug,
                    source: 'home-bar',
                  })
                }
                className="flex min-h-[80px] items-center justify-center rounded-card border border-surface-300 bg-white px-4 py-3 text-center text-sm font-semibold tracking-tight text-dark-900 transition-colors duration-200 ease-out hover:border-brand-300 hover:text-brand-800 focus-visible:border-brand-300 focus-visible:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:transition-none sm:text-base"
              >
                {locale === 'ko' ? category.labelKo : category.labelEn}
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex min-h-40 items-center justify-center rounded-card-lg border border-surface-300 bg-surface-100 px-6 py-10 text-center text-sm font-medium text-dark-600 sm:text-base">
            {t('home.category.empty')}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};
