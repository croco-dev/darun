import { Stack } from '@mantine/core';
import { IndexProductButton, ProductInfo, ProductTagsForm } from '@products/components';
import { AppShell } from '@uis';

export const ProductDetailPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <AppShell>
    <Stack gap={16}>
      <ProductInfo slug={slug} />
      <IndexProductButton slug={slug} />
      <ProductTagsForm slug={slug} />
    </Stack>
  </AppShell>
);
