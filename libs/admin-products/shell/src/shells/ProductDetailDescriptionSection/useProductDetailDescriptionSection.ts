import { useDisclosure } from '@mantine/hooks';

type ProductDetailDescriptionSectionProps = { slug: string };

export function useProductDetailDescriptionSection({ slug }: ProductDetailDescriptionSectionProps) {
  const [isEditModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  return { slug, isEditModalOpened, openEditModal, closeEditModal };
}
