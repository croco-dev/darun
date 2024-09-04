import { gql } from '@apollo/client';
import { useTempProductBySlugOnProductLinkTableQuery } from './__generated__/useProductLinkTable';

gql`
  query TempProductBySlugOnProductLinkTable($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      links {
        id
        title
        link
        displayLink
        iconUrl
        isPrimary
      }
    }
  }
`;

type ProductLinkTableProps = {
  slug: string;
};

export function useProductLinkTable({ slug }: ProductLinkTableProps) {
  const { data } = useTempProductBySlugOnProductLinkTableQuery({ variables: { slug } });
  return { links: data?.tempProductBySlug?.links };
}
