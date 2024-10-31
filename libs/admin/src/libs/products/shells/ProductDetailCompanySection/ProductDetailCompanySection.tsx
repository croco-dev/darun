'use client';

import { bind } from '@croco/utils-structure-react';
import { Link } from '@darun/utils-router';
import { Card, Group, Stack, Title, Button } from '@mantine/core';
import { ProductCompanyInfo } from '../../components/ProductCompanyInfo';
import { useProductDetailCompanySection } from './useProductDetailCompanySection';

export const ProductDetailCompanySection = bind(useProductDetailCompanySection, ({ slug }) => {
  return (
    <>
      <Stack gap={8}>
        <Group justify={'space-between'}>
          <Title order={3}>운영사 관리</Title>
        </Group>
        <Card withBorder shadow="sm" radius="md">
          <Card.Section withBorder inheritPadding py="xs">
            <ProductCompanyInfo slug={slug} />
            <div style={{ height: '12px' }}></div>
            <Link href={`/products/${slug}/company/new`}>
              <Button color={'dark'}>정보 수정</Button>
            </Link>
          </Card.Section>
        </Card>
      </Stack>
    </>
  );
});
