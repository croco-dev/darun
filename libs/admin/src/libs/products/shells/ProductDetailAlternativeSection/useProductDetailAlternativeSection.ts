import { useDisclosure } from '@mantine/hooks';

type ProductDetailAlternativeSectionProps = { slug: string };

export function useProductDetailAlternativeSection({ slug }: ProductDetailAlternativeSectionProps) {
  const [isEditModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  return { isEditModalOpened, openEditModal, closeEditModal, slug };
}
