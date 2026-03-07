import { AllCompaniesList } from '@darun/admin-companies/shell';
import { ProductListRefreshButton } from '@darun/admin-products/shell';
import { Link } from '@darun/utils-router';
import { Button, Group } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { AppShell, PageShell } from '../uis';

export const CompanyListPage = () => {
  return (
    <AppShell>
      <PageShell
        title={'기업(업체) 목록'}
        rightSide={
          <Group gap={'8px'}>
            <ProductListRefreshButton />
            <Link href="/companies/new">
              <Button rightSection={<IconPlus size={16} />} color={'dark'}>
                기업 추가
              </Button>
            </Link>
          </Group>
        }
      >
        <AllCompaniesList />
      </PageShell>
    </AppShell>
  );
};
