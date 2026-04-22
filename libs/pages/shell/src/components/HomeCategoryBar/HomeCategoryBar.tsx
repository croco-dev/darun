'use client';

import { gql, useSuspenseQuery } from '@apollo/client';
import { AnalyticsEvents, track } from '@darun/analytics-client';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

const CATEGORIES_QUERY = gql`
  query CategoriesForHomeCategoryBar($first: Int!, $locale: String!) {
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
  categories?: Category[] | null;
};

export const HomeCategoryBar = () => {
  const locale = useLocale();
  const router = useRouter();
  const { data } = useSuspenseQuery<CategoriesQueryResult>(CATEGORIES_QUERY, {
    variables: {
      first: 8,
      locale,
    },
  });

  const categories = (data?.categories ?? []).slice(0, 8);

  if (categories.length === 0) {
    return null;
  }

  const handleClick = (slug: string) => {
    track(AnalyticsEvents.CATEGORY_CHIP_CLICKED, {
      categorySlug: slug,
      source: 'home-bar',
    });
    router.push(`/${locale}/categories/${slug}`);
  };

  return (
    <div data-testid="home-category-bar" className="overflow-x-auto px-4 scrollbar-hide">
      <div className="flex min-w-max snap-x gap-2">
        {categories.map(category => (
          <button
            key={category.id}
            type="button"
            onClick={() => handleClick(category.slug)}
            className="snap-start rounded-full bg-brand-100 px-4 py-2 text-sm font-medium whitespace-nowrap text-brand-700 transition-colors hover:bg-brand-200"
          >
            {locale === 'ko' ? category.labelKo : category.labelEn}
          </button>
        ))}
      </div>
    </div>
  );
};
