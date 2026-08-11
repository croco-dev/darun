import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { ProductWithFeaturesOnProductFeatureListDocument } from '@darun/provider-graphql';
import { useLocale } from 'next-intl';


gql`
  query ProductWithFeaturesOnProductFeatureList($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      id
      features {
        id
        name
        emoji
        summary
        screenshots {
          id
          imageAlt
          imageUrl
        }
      }
    }
  }
`;

type ProductFeatureListProps = {
  slug: string;
};

export function useProductFeatureList({ slug }: ProductFeatureListProps) {
  const locale = useLocale();
  const { data } = useSuspenseQuery(ProductWithFeaturesOnProductFeatureListDocument, {
    variables: { slug, locale },
  });
  return { features: data?.productBySlug?.features ?? [] };
}
