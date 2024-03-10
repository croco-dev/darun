import { gql } from '@apollo/client';
import { useProductWithFeaturesOnProductAlternativeListSuspenseQuery } from './__generated__/useProductAlternativeList';

gql`
  query ProductWithFeaturesOnProductAlternativeList($slug: String!) {
    productBySlug(slug: $slug) {
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
  const { data } = useProductWithFeaturesOnProductAlternativeListSuspenseQuery({ variables: { slug } });
  return {
    products: data.productBySlug?.alternatives,
  };
};
