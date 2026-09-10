'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { CategoriesForEmptyStateDocument } from '@darun/provider-graphql';
import { useNavigate } from '@darun/utils-router';
import { useLocale } from 'next-intl';

const CATEGORIES_QUERY = gql`
  query CategoriesForEmptyState($first: Int!, $locale: String!) {
    categories(first: $first, locale: $locale) {
      id
      slug
      labelKo
      labelEn
    }
  }
`;

export const CATEGORY_ICONS: Record<string, string> = {
  ai: '🤖',
  productivity: '⚡️',
  design: '🎨',
  development: '💻',
  marketing: '📈',
  collaboration: '💬',
  business: '💼',
  analytics: '📊',
  security: '🔒',
  finance: '💳',
  writing: '✍️',
  education: '📚',
};

export function getCategoryIcon(slug: string): string {
  const normalized = slug.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (normalized.includes(key)) return icon;
  }
  return '✨';
}

export const CategoryShortcutGrid = () => {
  const locale = useLocale();
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(CategoriesForEmptyStateDocument, {
    variables: { first: 8, locale },
  });

  const categories = data?.categories ?? [];

  const handleClick = (slug: string) => {
    navigate(`/${locale}/categories/${slug}`);
  };

  return (
    <div
      data-testid="category-shortcut-grid"
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:gap-3"
      role="list"
      aria-label="Browse by category"
    >
      {categories.map(cat => (
        <button
          key={cat.id}
          type="button"
          role="listitem"
          onClick={() => handleClick(cat.slug)}
          className="group flex items-center gap-2.5 rounded-xl border border-dark-150 bg-white p-3 text-left text-sm font-semibold text-dark-800 shadow-button transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-dark-300 hover:bg-surface-100 hover:text-dark-950 hover:shadow-button-hover active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-lg leading-none shadow-2xs transition-colors group-hover:bg-white">
            {getCategoryIcon(cat.slug)}
          </span>
          <span className="truncate">{locale === 'ko' ? cat.labelKo : cat.labelEn}</span>
        </button>
      ))}
    </div>
  );
};
