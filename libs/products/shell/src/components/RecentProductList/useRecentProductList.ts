import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { RecentProductsOnRecentProductListDocument } from '@darun/provider-graphql';
import { useLocale } from 'next-intl';


// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query RecentProductsOnRecentProductList($locale: String!) {
    recentProducts(first: 8, locale: $locale) {
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
  const { data } = useSuspenseQuery(RecentProductsOnRecentProductListDocument, {
    variables: {
      locale,
    },
  });
  return {
    products: data?.recentProducts ?? [],
    locale,
  };
}
