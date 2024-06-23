'use client';

import { Card, Text } from '@mantine/core';
import { NewProductLinkSection } from '@products/shells';
import { AppShell, PageShell } from '@uis';

export const NewProductLinkPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <AppShell>
    <PageShell title={'서비스에 기능 추가'}>
      <Card withBorder shadow="sm" radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          <Text fw={500}>기능</Text>
        </Card.Section>
        <Card.Section inheritPadding mt="sm" pb="md">
          <NewProductLinkSection productSlug={slug} />
        </Card.Section>
      </Card>
    </PageShell>
  </AppShell>
);
