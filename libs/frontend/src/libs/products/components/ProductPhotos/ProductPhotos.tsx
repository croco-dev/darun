'use client';

import { bind } from '@croco/utils-structure-react';
import { css, Flex, HStack } from '@kuma-ui/core';
import Image from 'next/image';
import { useProductPhotos } from './useProductPhotos';

export const ProductPhotos = bind(useProductPhotos, ({ photos }) => (
  <Flex
    py={'8px'}
    px={'8px'}
    boxShadow={'0px 2px 8px 0px rgba(0, 0, 0, 0.10)'}
    border={'1px solid rgba(0, 0, 0, 0.1)'}
    borderRadius={'10px'}
  >
    {photos && (
      <HStack gap={'8px'} width={'max-content'} overflow={'auto'}>
        {photos.map(photo => (
          <Image
            src={photo.imageUrl}
            alt={photo.imageAlt}
            sizes="240px"
            fill
            className={css`
              border-radius: 4px;
              border: 1px solid rgba(0, 0, 0, 0.04);
              object-fit: contain;
              width: auto !important;
              height: 220px !important;
              position: relative !important;
            `}
          />
        ))}
      </HStack>
    )}
  </Flex>
));
