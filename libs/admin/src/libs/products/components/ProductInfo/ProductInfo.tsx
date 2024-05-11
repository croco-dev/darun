'use client';

import { bind } from '@croco/utils-structure-react';
import { Stack, Title } from '@mantine/core';
import Image from 'next/image';
import { useProductInfo } from './useProductInfo';

export const ProductInfo = bind(useProductInfo, ({ name, logoUrl }) => (
  <Stack gap={4}>
    <Title order={2}>{name}</Title>
    {logoUrl && (
      <Image
        src={logoUrl}
        unoptimized={!logoUrl}
        alt={`${name} 서비스 로고`}
        width={72}
        height={72}
        style={{
          objectFit: 'contain',
          borderRadius: 12,
          border: '1px solid rgba(0, 0, 0, 0.15)',
        }}
      />
    )}
  </Stack>
));
