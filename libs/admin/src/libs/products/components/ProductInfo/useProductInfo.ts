import { gql } from '@apollo/client';
import { useTempProductBySlugOnProductInfoQuery } from './__generated__/useProductInfo';

gql`
  query TempProductBySlugOnProductInfo($slug: String!) {
    tempProductBySlug(slug: $slug) {
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
  const { data } = useTempProductBySlugOnProductInfoQuery({
    variables: {
      slug,
    },
  });
  return {
    name: data?.tempProductBySlug?.name ?? '',
    logoUrl: data?.tempProductBySlug?.logoUrl,
  };
}
