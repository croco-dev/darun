import { bind } from '@croco/utils-structure-react';
import { Button, Card, Group, Stack, Title } from '@mantine/core';
import Link from 'next/link';
import { useProductDetailAlternativeSection } from './useProductDetailAlternativeSection';

export const ProductDetailAlternativeSection = bind(useProductDetailAlternativeSection, ({ slug }) => (
  <>
    <Stack gap={8}>
      <Group justify={'space-between'}>
        <Title order={3}>다른 서비스 관리</Title>
        <Link href={`/products/${slug}/alternatives/new`}>
          <Button color={'dark'}>다른 서비스 추가</Button>
        </Link>
      </Group>
      <Card withBorder shadow="sm" radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          준비중
        </Card.Section>
      </Card>
    </Stack>
  </>
));
