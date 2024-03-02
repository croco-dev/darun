import { gql } from '@apollo/client';
import { useProductOnProductDetailHeaderSuspenseQuery } from './__generated__/useProductDetailHeader';

gql`
  query ProductOnProductDetailHeader($slug: String!) {
    productBySlug(slug: $slug) {
      id
      links {
        id
        displayLink
        link
        title
        iconUrl
      }
    }
  }
`;

type ProductDetailHeaderProps = {
  slug: string;
};

export function useProductDetailHeader({ slug }: ProductDetailHeaderProps) {
  const { data } = useProductOnProductDetailHeaderSuspenseQuery({
    variables: {
      slug,
    },
  });
  return { slug, links: data.productBySlug?.links ?? [] };
}
