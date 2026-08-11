import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  EditProductLinkItemFragment,
  ProductLinkTableFragmentDoc,
  TempProductBySlugOnProductLinkTableDocument as TempProductBySlugOnProductLinkTableGeneratedDocument,
  useFragment,
} from '@darun/provider-graphql';
import { useDisclosure } from '@mantine/hooks';
import { useCallback, useState } from 'react';

export const TempProductBySlugOnProductLinkTableDocument = gql`
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
};

export function useProductLinkTable({ slug }: ProductLinkTableProps) {
  const { data, loading } = useQuery(TempProductBySlugOnProductLinkTableGeneratedDocument, {
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
