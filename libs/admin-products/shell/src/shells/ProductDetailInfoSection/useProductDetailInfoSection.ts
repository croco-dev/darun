import { useDisclosure } from '@mantine/hooks';

type ProductDetailInfoSectionProps = {
  slug: string;
};

export function useProductDetailInfoSection({ slug }: ProductDetailInfoSectionProps) {
  const [isEditModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  return { slug, isEditModalOpened, openEditModal, closeEditModal };
}
