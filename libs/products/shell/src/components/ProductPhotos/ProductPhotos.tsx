'use client';

import { bind } from '@croco/utils-structure-react';
import { css, Flex, HStack, Text } from '@kuma-ui/core';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import Zoom from 'react-medium-image-zoom';
import { useProductPhotos } from './useProductPhotos';

import 'react-medium-image-zoom/dist/styles.css';

type ProductPhotosViewProps = {
  photos: ReturnType<typeof useProductPhotos>['photos'];
};

export const ProductPhotos = bind(useProductPhotos, ({ photos }: ProductPhotosViewProps) => {
  const t = useTranslations('ProductDetail');

  if (!photos || photos.length === 0) {
    return (
      <Flex
        py={'16px'}
        px={'16px'}
        boxShadow={'0px 2px 8px 0px rgba(0, 0, 0, 0.10)'}
        border={'1px solid rgba(0, 0, 0, 0.1)'}
        borderRadius={'10px'}
      >
        <Text fontSize={'14px'} color={'colors.dark.500'}>
          {t('photo.empty')}
        </Text>
      </Flex>
    );
  }
  return (
    <Flex
      py={'8px'}
      px={'8px'}
      boxShadow={'0px 2px 8px 0px rgba(0, 0, 0, 0.10)'}
      border={'1px solid rgba(0, 0, 0, 0.1)'}
      borderRadius={'10px'}
    >
      {photos && (
        <HStack gap={'8px'} width={'max-content'} overflow={'auto'} position={'relative'}>
          {photos.map(photo => (
            <Zoom key={photo.imageUrl}>
              <Image
                src={photo.imageUrl}
                alt={photo.imageAlt}
                sizes="350px"
                fill={true}
                className={css`
                  border-radius: 4px;
                  border: 1px solid rgba(0, 0, 0, 0.04);
                  object-fit: contain;
                  width: auto !important;
                  height: 220px !important;
                  position: relative !important;
                `}
              />
            </Zoom>
          ))}
        </HStack>
      )}
    </Flex>
  );
});
