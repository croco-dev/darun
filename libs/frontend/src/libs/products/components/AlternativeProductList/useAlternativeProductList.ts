import { gql } from '@apollo/client';
import { useProductBySlugOnAlternativeProductListSuspenseQuery } from './__generated__/useAlternativeProductList';

gql`
  query ProductBySlugOnAlternativeProductList($slug: String!) {
    productBySlug(slug: $slug) {
      id
      alternatives {
        id
        name
        slug
        summary
        logoUrl
        tags {
          id
          name
        }
      }
    }
  }
`;

type AlternativeProductListProps = {
  slug: string;
};
export function useAlternativeProductList({ slug }: AlternativeProductListProps) {
  const { data } = useProductBySlugOnAlternativeProductListSuspenseQuery({ variables: { slug } });

  return {
    alternatives: data.productBySlug?.alternatives ?? [],
  };
}
