import { Stack } from '@mantine/core';
import { NewProductButton } from '@products/components';
import { ProductListSection } from '@products/shells';
import { AppShell } from '@uis';

export const ProductListPage = () => {
  return (
    <AppShell>
      <Stack w="100%">
        <NewProductButton />
        <ProductListSection />
      </Stack>
    </AppShell>
  );
};
