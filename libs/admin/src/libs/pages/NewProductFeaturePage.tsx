'use client';

import { Card, Text } from '@mantine/core';
import { AppShell, PageShell } from '@uis';
import { NewProductFeatureFormSection } from '../products/shells/NewProductFeatureFormSection';

export const NewProductFeaturePage = ({ params: { slug } }: { params: { slug: string } }) => (
  <AppShell>
    <PageShell title={'서비스에 기능 추가'}>
      <Card withBorder shadow="sm" radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          <Text fw={500}>기능</Text>
        </Card.Section>
        <Card.Section inheritPadding mt="sm" pb="md">
          <NewProductFeatureFormSection productSlug={slug} />
        </Card.Section>
      </Card>
    </PageShell>
  </AppShell>
);
