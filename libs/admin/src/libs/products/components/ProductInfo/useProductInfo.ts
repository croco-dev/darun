import { gql } from '@apollo/client';
import { useTempProductBySlugOnProductInfoQuery } from './__generated__/useProductInfo';

gql`
  query TempProductBySlugOnProductInfo($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      name
      slug
      summary
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
    slug: data?.tempProductBySlug?.slug,
    summary: data?.tempProductBySlug?.summary,
    logoUrl: data?.tempProductBySlug?.logoUrl,
  };
}
