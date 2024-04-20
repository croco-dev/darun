import { NewProductButton } from '@products/components';
import { ProductListSection } from '@products/shells';
import { AppShell } from '@uis';

export const ProductListPage = () => {
  return (
    <AppShell>
      <NewProductButton />
      <ProductListSection />
    </AppShell>
  );
};
