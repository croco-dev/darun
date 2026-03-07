import { gql } from '@apollo/client';
import { useLocale } from 'next-intl';
import { useProductWithFeaturesOnProductFeatureListSuspenseQuery } from './__generated__/useProductFeatureList';

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
  const { data } = useProductWithFeaturesOnProductFeatureListSuspenseQuery({
    variables: { slug, locale },
  });
  return { features: data?.productBySlug?.features ?? [] };
}
