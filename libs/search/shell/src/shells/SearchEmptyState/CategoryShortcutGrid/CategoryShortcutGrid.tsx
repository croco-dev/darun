import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { getCategoryIcon } from '@darun/products-shell';
import { CategoriesForEmptyStateDocument } from '@darun/provider-graphql';
import { Link } from '@darun/utils-router';
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
  const { data } = useSuspenseQuery(CategoriesForEmptyStateDocument, {
    variables: { first: 8, locale },
  });

  const categories = data?.categories ?? [];

  return (
    <div
      data-testid="category-shortcut-grid"
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:gap-3"
      role="group"
      aria-label="Browse by category"
    >
      {categories.map(cat => (
        <Link
          key={cat.id}
          href={`/${locale}/categories/${cat.slug}`}
          className="group flex items-center gap-2.5 rounded-xl border border-dark-150 bg-white p-3 text-left text-sm font-semibold text-dark-800 shadow-button transition-colors duration-150 ease-out hover:border-dark-300 hover:bg-surface-100 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dark-150/70 bg-surface-100 text-lg leading-none shadow-2xs transition-colors duration-150 group-hover:border-dark-300 group-hover:bg-white">
            {getCategoryIcon(cat.slug)}
          </span>
          <span className="truncate">{locale === 'ko' ? cat.labelKo : cat.labelEn}</span>
        </Link>
      ))}
    </div>
  );
};
