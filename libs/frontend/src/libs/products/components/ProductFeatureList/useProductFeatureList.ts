import { gql } from '@apollo/client';
import { useProductWithFeaturesOnProductFeatureListSuspenseQuery } from './__generated__/useProductFeatureList';

gql`
  query ProductWithFeaturesOnProductFeatureList($slug: String!) {
    productBySlug(slug: $slug) {
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
  const { data } = useProductWithFeaturesOnProductFeatureListSuspenseQuery({
    variables: { slug },
  });
  return { features: data.productBySlug?.features ?? [] };
}
