import { Card, Text } from '@mantine/core';
import { EditProductCompany } from '../../components/EditProductCompany';

export function ProductCompanyEditSection({ slug }: { slug: string }) {
  return (
    <Card withBorder shadow="sm" radius="md">
      <Card.Section withBorder inheritPadding py="xs">
        <Text fw={500}>회사 수정</Text>
      </Card.Section>
      <Card.Section inheritPadding mt="sm" pb="md">
        <EditProductCompany slug={slug} />
      </Card.Section>
    </Card>
  );
}
