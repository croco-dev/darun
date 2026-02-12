import { gql } from '@apollo/client';
import { useLocale } from 'next-intl';
import { useRankedProductsOnRankedProductListSuspenseQuery } from './__generated__/useRankedProductList';

gql`
  query RankedProductsOnRankedProductList($locale: String!) {
    rankedProducts(first: 30, locale: $locale) {
      id
      name
      slug
      logoUrl
      summary
      voteCount
      tags {
        id
        name
      }
    }
  }
`;

export function useRankedProductList() {
  const locale = useLocale();
  const { data } = useRankedProductsOnRankedProductListSuspenseQuery({
    variables: {
      locale,
    },
  });
  return {
    products: data?.rankedProducts ?? [],
  };
}
