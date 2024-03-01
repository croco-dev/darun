import { gql } from '@apollo/client';
import { useProductOnProductInformationLinkSuspenseQuery } from './__generated__/useProductInformationLink';

gql`
  query ProductOnProductInformationLink($slug: String!) {
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

type ProductInformationLinkProps = { slug: string };

export function useProductInformationLink({ slug }: ProductInformationLinkProps) {
  const { data } = useProductOnProductInformationLinkSuspenseQuery({ variables: { slug } });
  return { links: data.productBySlug?.links ?? [] };
}
