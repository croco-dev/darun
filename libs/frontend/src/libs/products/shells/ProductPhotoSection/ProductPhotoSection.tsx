import { Text, VStack } from '@kuma-ui/core';
import { ProductPhotos } from '@products/components';

type ProductPhotoSectionProps = { screenshots?: { imageUrl: string; imageAlt: string }[] };

export const ProductPhotoSection = ({ screenshots }: ProductPhotoSectionProps) => {
  if (!screenshots || screenshots.length === 0) {
    return <></>;
  }
  return (
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
      <ProductPhotos screenshots={screenshots} />
    </VStack>
  );
};
