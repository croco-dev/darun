import { gql } from '@apollo/client';
import { useProductBySlugOnProductSummarySuspenseQuery } from './__generated__/useProductSummary';

gql`
  query ProductBySlugOnProductSummary($slug: String!) {
    productBySlug(slug: $slug) {
      id
      name
    }
  }
`;
export function useProductSummary() {
  const { data } = useProductBySlugOnProductSummarySuspenseQuery();
  return {
    name: data.productBySlug?.name,
  };
}
