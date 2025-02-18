'use client';

import { Card, Stack } from '@mantine/core';
import { WriteMagazine } from '../../components/WriteMagazine';

export const MagazineWriteSection = () => (
  <Card withBorder shadow="sm" radius="md">
    <Card.Section inheritPadding mt="sm" pb="md">
      <Stack gap={'12px'}>
        <WriteMagazine />
      </Stack>
    </Card.Section>
  </Card>
);
