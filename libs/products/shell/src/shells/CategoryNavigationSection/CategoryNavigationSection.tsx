'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { AnalyticsEvents, track } from '@darun/analytics-client';
import { ChevronRight, SectionHeader, SectionWrapper } from '@darun/ui';
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

export const CATEGORY_ICONS: Record<string, string> = {
  'developer-tools': '💻',
  development: '💻',
  'health-fitness': '💪',
  health: '💪',
  fitness: '💪',
  games: '🎮',
  game: '🎮',
  education: '📚',
  reference: '📖',
  finance: '💳',
  navigation: '🧭',
  news: '📰',
  lifestyle: '🪴',
  business: '💼',
  'photo-video': '📸',
  photo: '📸',
  video: '🎬',
  productivity: '⚡️',
  'social-networking': '💬',
  social: '💬',
  collaboration: '💬',
  shopping: '🛍️',
  entertainment: '🍿',
  utilities: '🛠️',
  utility: '🛠️',
  'food-drink': '☕️',
  food: '☕️',
  ai: '🤖',
  design: '🎨',
  marketing: '📈',
  analytics: '📊',
  security: '🔒',
  writing: '✍️',
};

export function getCategoryIcon(slug: string): string {
  const normalized = slug.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (normalized.includes(key)) return icon;
  }
  return '✨';
}

export const CategoryNavigationSection = () => {
  const t = useTranslations();
  const locale = useLocale();
  const { data } = useSuspenseQuery<CategoriesQueryResult>(CATEGORIES_QUERY, {
    variables: { first: 8, locale },
  });

  const categories = (data?.categories ?? []).slice(0, 8);

  return (
    <SectionWrapper background="white" spacing="sm">
      <div className="flex w-full flex-col gap-5 md:gap-6">
        <SectionHeader
          title={t('home.category.title')}
          moreLink={
            <Link
              href={`/${locale}/search/product`}
              className="group inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-dark-700 transition-colors duration-200 ease-out hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/70 motion-reduce:transition-none"
            >
              <span>{t('home.category.more')}</span>
              <ChevronRight
                size={16}
                className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </Link>
          }
        />
        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-2.5 md:gap-3">
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
                className="group inline-flex items-center gap-2 rounded-full border border-dark-150 bg-white px-4 py-2 text-sm font-semibold text-dark-800 shadow-button transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-dark-300 hover:bg-surface-100 hover:text-dark-950 hover:shadow-button-hover active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none sm:px-5 sm:py-2.5"
              >
                <span className="text-base leading-none">{getCategoryIcon(category.slug)}</span>
                <span>{locale === 'ko' ? category.labelKo : category.labelEn}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex min-h-36 flex-col items-center justify-center rounded-card-lg border border-dark-150 bg-white px-6 py-10 text-center shadow-card">
            <span className="mb-2 text-2xl" aria-hidden="true">🪴</span>
            <p className="text-sm font-semibold text-dark-900 break-keep">{t('home.category.empty')}</p>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};
