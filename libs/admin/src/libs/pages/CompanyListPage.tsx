import { Link } from '@darun/utils-router';
import { Button, Group } from '@mantine/core';
import { ProductListRefreshButton } from '@products/components';
import { IconPlus } from '@tabler/icons-react';
import { AppShell, PageShell } from '@uis';
import { AllCompaniesList } from '../companies/shells/AllCompaniesList';

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
