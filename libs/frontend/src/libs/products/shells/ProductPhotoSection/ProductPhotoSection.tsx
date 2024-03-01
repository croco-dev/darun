import { Text, VStack } from '@kuma-ui/core';
import { ProductPhotos } from '@products/components';

type ProductPhotoSectionProps = { slug: string };

export const ProductPhotoSection = ({ slug }: ProductPhotoSectionProps) => (
  <VStack as="section" gap={'20px'} py={'16px'}>
    <Text
      as={'h2'}
      id={'screenshot'}
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
