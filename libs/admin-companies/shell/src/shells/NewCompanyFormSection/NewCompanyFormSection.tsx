'use client';

import { Card, Stack, Text } from '@mantine/core';
import { NewCompanyForm } from '../../components/NewCompanyForm';

export const NewCompanyFormSection = () => {
  return (
    <Card withBorder shadow="sm" radius="md">
      <Card.Section withBorder inheritPadding py="xs">
        <Text fw={500}>기업 등록</Text>
      </Card.Section>
      <Card.Section inheritPadding mt="sm" pb="md">
        <Stack gap={'12px'}>
          <NewCompanyForm />
        </Stack>
      </Card.Section>
    </Card>
  );
};
