'use client';

import { Card, Text } from '@mantine/core';
import { AppShell, PageShell } from '@uis';
import { NewProductAlternativeFormSection } from '../products/shells/NewProductAlternativeFormSection';

export const NewProductAlternativePage = ({ params: { slug } }: { params: { slug: string } }) => (
  <AppShell>
    <PageShell title={'서비스에 다른 서비스 추가'}>
      <Card withBorder shadow="sm" radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          <Text fw={500}>기능</Text>
        </Card.Section>
        <Card.Section inheritPadding mt="sm" pb="md">
          <NewProductAlternativeFormSection productSlug={slug} />
        </Card.Section>
      </Card>
    </PageShell>
  </AppShell>
);
