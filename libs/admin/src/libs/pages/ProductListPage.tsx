import { Link } from '@darun/utils-router';
import { Button, Flex, Stack, Title } from '@mantine/core';
import { ProductListSection } from '@products/shells';
import { AppShell } from '@uis';

export const ProductListPage = () => {
  return (
    <AppShell>
      <Stack w="100%" p={16}>
        <Flex direction="row" justify="space-between">
          <Title>서비스 목록</Title>
          <Link href="/products/new">
            <Button>추가하기</Button>
          </Link>
        </Flex>
        <ProductListSection />
      </Stack>
    </AppShell>
  );
};
