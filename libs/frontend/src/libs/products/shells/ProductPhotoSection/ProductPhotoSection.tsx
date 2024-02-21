import { Text, VStack } from '@kuma-ui/core';
import { ProductPhotos } from '../../components/ProductPhotos';

type ProductPhotoSectionProps = { slug: string };

export const ProductPhotoSection = ({ slug }: ProductPhotoSectionProps) => (
  <VStack as="section" gap={'8px'} py={'16px'}>
    <Text
      as={'h2'}
      id={'description'}
      fontWeight={'fontWeights.semibold'}
      fontSize={24}
      color={'colors.dark.900'}
      letterSpacing={'-.4px'}
    >
      스크린샷
    </Text>
    <ProductPhotos slug={slug} />
  </VStack>
);
