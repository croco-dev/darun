import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { RankedProductsOnRankedProductListDocument } from '@darun/provider-graphql';
import { useLocale } from 'next-intl';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
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
  const { data } = useSuspenseQuery(RankedProductsOnRankedProductListDocument, {
    variables: {
      locale,
    },
  });
  return {
    products: data?.rankedProducts ?? [],
    locale,
  };
}
