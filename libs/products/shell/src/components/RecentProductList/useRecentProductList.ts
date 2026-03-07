import { gql } from '@apollo/client';
import { useLocale } from 'next-intl';
import { useRecentProductsOnRecentProductListSuspenseQuery } from './__generated__/useRecentProductList';

gql`
  query RecentProductsOnRecentProductList($locale: String!) {
    recentProducts(first: 24, locale: $locale) {
      id
      name
      slug
      logoUrl
      summary
      tags {
        id
        name
      }
    }
  }
`;

export function useRecentProductList() {
  const locale = useLocale();
  const { data } = useRecentProductsOnRecentProductListSuspenseQuery({
    variables: {
      locale,
    },
  });
  return {
    products: data?.recentProducts ?? [],
  };
}
