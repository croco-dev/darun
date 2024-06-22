'use client';

import { Card, Text } from '@mantine/core';
import { NewProductScreenshotFormSection } from '@products/shells';
import { AppShell, PageShell } from '@uis';

export const NewProductScreenshotPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <AppShell>
    <PageShell title={'서비스에 스크린샷 추가'}>
      <Card withBorder shadow="sm" radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          <Text fw={500}>스크린샷</Text>
        </Card.Section>
        <Card.Section inheritPadding mt="sm" pb="md">
          <NewProductScreenshotFormSection productSlug={slug} />
        </Card.Section>
      </Card>
    </PageShell>
  </AppShell>
);
