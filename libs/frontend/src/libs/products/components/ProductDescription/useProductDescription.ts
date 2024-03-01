import { gql } from '@apollo/client';
import { useProductBySlugOnProductSummarySuspenseQuery } from './__generated__/useProductDescription';

gql`
  query ProductBySlugOnProductSummary($slug: String!) {
    productBySlug(slug: $slug) {
      id
      description
    }
  }
`;

type ProductSummaryProps = {
  slug: string;
};

export function useProductDescription({ slug }: ProductSummaryProps) {
  const { data } = useProductBySlugOnProductSummarySuspenseQuery({
    variables: {
      slug,
    },
  });

  return {
    description: data.productBySlug?.description ?? '',
  };
}
