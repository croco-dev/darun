import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  EditProductLinkItemFragment,
  ProductLinkTableFragmentDoc,
  TempProductBySlugOnProductLinkTableDocument,
  useFragment,
} from '@darun/provider-graphql';
import { useDisclosure } from '@mantine/hooks';
import { useCallback, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query TempProductBySlugOnProductLinkTable($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      ...ProductLinkTable
    }
  }
`;

type ProductLinkTableProps = {
  slug: string;
};

export function useProductLinkTable({ slug }: ProductLinkTableProps) {
  const { data, loading } = useQuery(TempProductBySlugOnProductLinkTableDocument, {
    variables: { slug },
  });
  const product = useFragment(ProductLinkTableFragmentDoc, data?.tempProductBySlug ?? null);

  const [isEditModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [link, setLink] = useState<EditProductLinkItemFragment | null>(null);

  const editLink = useCallback(
    (selectedLink: EditProductLinkItemFragment) => {
      setLink(selectedLink);
      openEditModal();
    },
    [openEditModal]
  );

  return {
    links: product?.links,
    loading,
    editLink,
    isEditModalOpened,
    closeEditModal,
    link,
    slug,
  };
}
