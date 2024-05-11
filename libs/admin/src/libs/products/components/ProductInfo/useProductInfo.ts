import { gql } from '@apollo/client';
import { useProductBySlugOnProductInfoQuery } from './__generated__/useProductInfo';

gql`
  query ProductBySlugOnProductInfo($slug: String!) {
    productBySlug(slug: $slug) {
      id
      name
      logoUrl
    }
  }
`;

type ProductInfoProps = {
  slug: string;
};

export function useProductInfo({ slug }: ProductInfoProps) {
  const { data } = useProductBySlugOnProductInfoQuery({
    variables: {
      slug,
    },
  });
  return {
    name: data?.productBySlug?.name ?? '',
    logoUrl: data?.productBySlug?.logoUrl,
  };
}
