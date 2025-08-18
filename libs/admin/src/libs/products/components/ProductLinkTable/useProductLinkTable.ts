import { gql } from '@apollo/client';
import { useDisclosure } from '@mantine/hooks';
import { useCallback, useState } from 'react';
import { EditProductLinkItemFragment } from '../EditProductLinkItem/__generated__/EditProductLinkItem';
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
};

export function useProductLinkTable({ slug }: ProductLinkTableProps) {
  const { data, loading } = useTempProductBySlugOnProductLinkTableQuery({ variables: { slug } });

  const [isEditModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [link, setLink] = useState<EditProductLinkItemFragment>();

  const editLink = useCallback(
    (selectedLink: EditProductLinkItemFragment) => {
      setLink(selectedLink);
      openEditModal();
    },
    [openEditModal]
  );

  return {
    links: data?.tempProductBySlug?.links,
    loading,
    editLink,
    isEditModalOpened,
    closeEditModal,
    link,
    slug,
  };
}
