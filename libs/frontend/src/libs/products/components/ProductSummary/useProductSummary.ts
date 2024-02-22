import { gql } from '@apollo/client';
import { useProductBySlugOnProductSummarySuspenseQuery } from './__generated__/useProductSummary';

gql`
  query ProductBySlugOnProductSummary($slug: String!) {
    productBySlug(slug: $slug) {
      id
      name
      summary
      description
      logoUrl
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
    summary: data.productBySlug?.summary,
    description: data.productBySlug?.description,
    logoUrl: data.productBySlug?.logoUrl,
  };
}
