'use client';

import { bind } from '@croco/utils-structure-react';
import { Code, Group, Stack, Title } from '@mantine/core';
import Image from 'next/image';
import { useProductInfo } from './useProductInfo';

export const ProductInfo = bind(useProductInfo, ({ name, logoUrl, slug }) => (
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
    <Stack gap="4px">
      <Title order={2} size={'24px'}>
        {name}
      </Title>
      {slug && (
        <Code fw={700} display={'inline-flex'} style={{ width: 'fit-content' }}>
          {slug}
        </Code>
      )}
    </Stack>
  </Group>
));
