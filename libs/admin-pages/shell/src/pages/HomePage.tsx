import { Text } from '@mantine/core';
import { AppShell, PageShell } from '../uis';

export const HomePage = () => {
  return (
    <AppShell>
      <PageShell title={'대시보드'}>
        <Text c={'dimmed'}>왼쪽 메뉴에서 작업을 선택하세요.</Text>
      </PageShell>
    </AppShell>
  );
};
