import { gql } from '@apollo/client';
import { useProductOnProductLinksSuspenseQuery } from './__generated__/useProductLinks';

gql`
  query ProductOnProductLinks($slug: String!) {
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

type ProductLinksProps = { slug: string };

export function useProductLinks({ slug }: ProductLinksProps) {
  const { data } = useProductOnProductLinksSuspenseQuery({
    variables: { slug },
  });
  return { links: data.productBySlug?.links ?? [] };
}
