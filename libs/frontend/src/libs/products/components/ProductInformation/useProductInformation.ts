import { gql } from '@apollo/client';
import { useProductBySlugOnProductInformationSuspenseQuery } from './__generated__/useProductInformation';

gql`
  query ProductBySlugOnProductInformation($slug: String!) {
    productBySlug(slug: $slug) {
      id
      name
      summary
      description
      logoUrl
    }
  }
`;

type ProductInformationProps = { slug: string };

export function useProductInformation({ slug }: ProductInformationProps) {
  const { data } = useProductBySlugOnProductInformationSuspenseQuery({
    variables: { slug },
  });
  return {
    name: data.productBySlug?.name,
    summary: data.productBySlug?.summary,
    logoUrl: data.productBySlug?.logoUrl,
  };
}
