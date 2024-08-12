'use client';

import { Button, Card, Group, Stack, Title } from '@mantine/core';
import { ProductTagsForm } from '@products/components';
import { ProductDetailInfoSection, ProductDetailDescriptionSection } from '@products/shells';
import { AppShell, PageShell } from '@uis';
import Link from 'next/link';
import { ProductDetailFeatureSection } from '../products/shells/ProductDetailFeatureSection';

export const ProductDetailPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <AppShell>
    <PageShell title={'서비스 상세'}>
      <ProductDetailInfoSection slug={slug} />
      <Stack gap={32}>
        <ProductDetailDescriptionSection slug={slug} />
        <ProductDetailFeatureSection slug={slug} />
        <Stack gap={8}>
          <Group justify={'space-between'}>
            <Title order={3}>스크린샷 관리</Title>
            <Link href={`/products/${slug}/screenshots/new`}>
              <Button color={'dark'}>스크린샷 추가</Button>
            </Link>
          </Group>
          <Card withBorder shadow="sm" radius="md">
            <Card.Section withBorder inheritPadding py="xs">
              미완
            </Card.Section>
          </Card>
        </Stack>
        <Stack gap={8}>
          <Title order={3}>태그 관리</Title>
          <ProductTagsForm slug={slug} />
        </Stack>
      </Stack>
    </PageShell>
  </AppShell>
);
