import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { ProductWithFeaturesOnProductAlternativeListDocument } from '@darun/provider-graphql';
import { useLocale } from 'next-intl';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query ProductWithFeaturesOnProductAlternativeList($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      id
      alternatives {
        id
        slug
        name
        logoUrl
        summary
        tags {
          id
          name
        }
        description
        features {
          emoji
          id
          name
          summary
        }
      }
    }
  }
`;

type ProductAlternativeListProps = {
  slug: string;
};

export const useProductAlternativeList = ({ slug }: ProductAlternativeListProps) => {
  const locale = useLocale();
  const { data } = useSuspenseQuery(ProductWithFeaturesOnProductAlternativeListDocument, {
    variables: { slug, locale },
  });
  return {
    products: data?.productBySlug?.alternatives,
    locale,
  };
};
