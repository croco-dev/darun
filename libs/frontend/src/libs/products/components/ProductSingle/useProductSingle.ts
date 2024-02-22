import { gql } from '@apollo/client';
import { useProductBySlugOnProductSingleSuspenseQuery } from './__generated__/useProductSingle';

gql`
  query ProductBySlugOnProductSingle($slug: String!) {
    productBySlug(slug: $slug) {
      id
      name
      summary
      description
      logoUrl
    }
  }
`;

type ProductSingleProps = { slug: string };

export function useProductSingle({ slug }: ProductSingleProps) {
  const { data } = useProductBySlugOnProductSingleSuspenseQuery({ variables: { slug } });
  return {
    name: data.productBySlug?.name,
    summary: data.productBySlug?.summary,
    logoUrl: data.productBySlug?.logoUrl,
  };
}
