import { useDisclosure } from '@mantine/hooks';
import { useCallback, useState } from 'react';

type ProductDetailFeatureSectionProps = { slug: string };

export function useProductDetailFeatureSection({ slug }: ProductDetailFeatureSectionProps) {
  const [isEditModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [featureId, setFeatureId] = useState<string>();

  const editFeature = useCallback(
    (id: string) => {
      setFeatureId(id);
      openEditModal();
    },
    [openEditModal]
  );

  return { isEditModalOpened, openEditModal, closeEditModal, editFeature, slug, featureId };
}
