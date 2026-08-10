'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
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

type Category = {
  id: string;
  slug: string;
  labelKo: string;
  labelEn: string;
};

type CategoriesQueryResult = {
  categories: Category[];
};

export const CategoryShortcutGrid = () => {
  const locale = useLocale();
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(CATEGORIES_QUERY, {
    variables: { first: 8, locale },
  });

  const categories = (data as unknown as CategoriesQueryResult)?.categories ?? [];

  const handleClick = (slug: string) => {
    navigate(`/${locale}/categories/${slug}`);
  };

  return (
    <div
      data-testid="category-shortcut-grid"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      role="list"
      aria-label="Browse by category"
    >
      {categories.map(cat => (
        <button
          key={cat.id}
          type="button"
          role="listitem"
          onClick={() => handleClick(cat.slug)}
          className="rounded-xl bg-surface-100 px-4 py-3 text-sm font-medium text-dark-700 transition-colors hover:bg-dark-100 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/70 focus-visible:ring-offset-2"
        >
          {locale === 'ko' ? cat.labelKo : cat.labelEn}
        </button>
      ))}
    </div>
  );
};
