import { gql } from '@apollo/client';
import { ProductLinkTableFragmentDoc } from './__generated__/ProductLinkTable';
import { useTempProductBySlugOnProductLinkTableQuery } from './__generated__/useProductLinkTable';

gql`
  query TempProductBySlugOnProductLinkTable($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      ...ProductLinkTable
    }
  }

  ${ProductLinkTableFragmentDoc}
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
