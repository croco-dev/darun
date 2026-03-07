'use client';

import { bind } from '@croco/utils-structure-react';
import { Code, Group, Stack, Title, Text } from '@mantine/core';
import Image from 'next/image';
import { useProductInfo } from './useProductInfo';

export const ProductInfo = bind(useProductInfo, ({ name, logoUrl, summary, slug }) => (
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
      <Stack gap="1px">
        <Title order={2} size={'24px'}>
          {name}
        </Title>
        <Text c="dimmed" size={'sm'}>
          {summary}
        </Text>
      </Stack>
      {slug && (
        <Code fw={700} display={'inline-flex'} style={{ width: 'fit-content' }}>
          {slug}
        </Code>
      )}
    </Stack>
  </Group>
));
