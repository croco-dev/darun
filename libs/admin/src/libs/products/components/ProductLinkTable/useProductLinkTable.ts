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
  editLink: (link: {
    id: string;
    title: string;
    link: string;
    displayLink: string;
    iconUrl: string;
    isPrimary?: boolean;
  }) => void;
};

export function useProductLinkTable({ slug, editLink }: ProductLinkTableProps) {
  const { data, loading } = useTempProductBySlugOnProductLinkTableQuery({ variables: { slug } });
  return { links: data?.tempProductBySlug?.links, loading, editLink };
}
