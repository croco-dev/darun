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
  communication: '💬',
  cloud: '☁️',
  commerce: '🛍️',
  audio: '🎵',
  recruiting: '👥',
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
          subtitle={t('home.category.description')}
          moreLink={
            <Link
              href={`/${locale}/search/product`}
              className="group inline-flex min-h-11 items-center gap-1 rounded-lg px-2 -mr-2 text-sm font-semibold text-dark-700 transition-colors duration-200 ease-out hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/70 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              <span>{t('home.category.more')}</span>
              <ChevronRight
                size={16}
                aria-hidden="true"
                className="shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </Link>
          }
        />
        {categories.length > 0 ? (
          <div role="group" aria-label={t('home.category.title')} className="flex flex-wrap gap-2.5 md:gap-3">
            {categories.map(category => (
              <Link
                key={category.id}
                href={`/${locale}/categories/${encodeURIComponent(category.slug)}`}
                onClick={() =>
                  track(AnalyticsEvents.CATEGORY_CHIP_CLICKED, {
                    categorySlug: category.slug,
                    source: 'home-bar',
                  })
                }
                className="group inline-flex items-center gap-2 rounded-full border border-dark-150 bg-white px-4 py-2 text-sm font-semibold text-dark-800 shadow-button transition-all duration-150 ease-out active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none hover:border-dark-300 hover:bg-surface-100 hover:text-dark-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 sm:px-5 sm:py-2.5"
              >
                <span
                  aria-hidden="true"
                  className="shrink-0 text-base leading-none transition-transform duration-200 group-hover:scale-110 motion-reduce:transform-none"
                >
                  {getCategoryIcon(category.slug)}
                </span>
                <span>{locale === 'ko' ? category.labelKo : category.labelEn}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-dark-200/80 bg-surface-50/50 px-6 py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-2xl shadow-2xs">
              <span aria-hidden="true">🪴</span>
            </div>
            <p className="text-sm font-semibold text-dark-900 break-keep">{t('home.category.empty')}</p>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};
