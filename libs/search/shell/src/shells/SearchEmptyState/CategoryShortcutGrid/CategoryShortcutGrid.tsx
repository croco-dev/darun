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
      className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:gap-3"
      role="list"
      aria-label="Browse by category"
    >
      {categories.map(cat => (
        <button
          key={cat.id}
          type="button"
          role="listitem"
          onClick={() => handleClick(cat.slug)}
          className="rounded-xl border border-dark-150 bg-white px-4 py-3 text-left text-sm font-medium text-dark-700 shadow-button transition-all duration-200 ease-out hover:-translate-y-px hover:border-dark-300 hover:bg-surface-100 hover:text-dark-900 hover:shadow-button-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
        >
          {locale === 'ko' ? cat.labelKo : cat.labelEn}
        </button>
      ))}
    </div>
  );
};
