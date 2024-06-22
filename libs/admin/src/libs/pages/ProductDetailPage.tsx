import { Link } from '@darun/utils-router';
import { Button, Flex, Stack } from '@mantine/core';
import { IndexProductButton, ProductInfo, ProductTagsForm } from '@products/components';
import { AppShell } from '@uis';

export const ProductDetailPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <AppShell>
    <Stack gap={16}>
      <ProductInfo slug={slug} />
      <Flex direction="row" gap={4}>
        <Link href={`/products/${slug}/features/new`}>
          <Button>새 기능 추가하기</Button>
        </Link>
        <Link href={`/products/${slug}/screenshots/new`}>
          <Button>스크린샷 추가하기</Button>
        </Link>
        <IndexProductButton slug={slug} />
      </Flex>
      <ProductTagsForm slug={slug} />
    </Stack>
  </AppShell>
);
