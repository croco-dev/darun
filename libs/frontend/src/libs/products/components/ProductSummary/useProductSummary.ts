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

type ProductSummaryProps = {
  slug: string;
};

export function useProductSummary({ slug }: ProductSummaryProps) {
  const { data } = useProductBySlugOnProductSummarySuspenseQuery({
    variables: {
      slug,
    },
  });
  return {
    name: data.productBySlug?.name,
  };
}
