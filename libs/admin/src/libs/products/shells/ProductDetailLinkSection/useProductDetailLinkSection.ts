import { useDisclosure } from '@mantine/hooks';
import { useCallback, useState } from 'react';

type ProductDetailLinkSectionProps = {
  slug: string;
};

export function useProductDetailLinkSection({ slug }: ProductDetailLinkSectionProps) {
  const [isEditModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [link, setLink] = useState<{
    id: string;
    title: string;
    link: string;
    displayLink: string;
    iconUrl: string;
  }>();

  const editLink = useCallback(
    (selectedLink: { id: string; title: string; link: string; displayLink: string; iconUrl: string }) => {
      setLink(selectedLink);
      openEditModal();
    },
    [openEditModal]
  );

  return { slug, isEditModalOpened, closeEditModal, editLink, link };
}
