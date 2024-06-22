import { Link } from '@darun/utils-router';
import { Button } from '@mantine/core';
import { ProductListSection } from '@products/shells';
import { IconPlus } from '@tabler/icons-react';
import { AppShell, PageShell } from '@uis';

export const ProductListPage = () => {
  return (
    <AppShell>
      <PageShell
        title={'서비스 목록'}
        rightSide={
          <Link href="/products/new">
            <Button rightSection={<IconPlus size={16} />} color={'dark'}>
              추가하기
            </Button>
          </Link>
        }
      >
        <ProductListSection />
      </PageShell>
    </AppShell>
  );
};
