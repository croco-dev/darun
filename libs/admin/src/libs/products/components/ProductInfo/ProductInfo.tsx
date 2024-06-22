'use client';

import { bind } from '@croco/utils-structure-react';
import { Group, Title } from '@mantine/core';
import Image from 'next/image';
import { useProductInfo } from './useProductInfo';

export const ProductInfo = bind(useProductInfo, ({ name, logoUrl }) => (
  <Group gap={12}>
    {logoUrl && (
      <Image
        src={logoUrl}
        unoptimized={!logoUrl}
        alt={`${name} 서비스 로고`}
        width={64}
        height={64}
        style={{
          objectFit: 'contain',
          borderRadius: 12,
          border: '1px solid rgba(0, 0, 0, 0.15)',
        }}
      />
    )}
    <Title order={2}>{name}</Title>
  </Group>
));
