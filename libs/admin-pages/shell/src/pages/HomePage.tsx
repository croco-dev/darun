
import { AppShell, PageShell } from '../uis';

export const HomePage = () => {
  return (
    <AppShell>
      <PageShell title={'대시보드'}>
        <p className="text-gray-500">왼쪽 메뉴에서 작업을 선택하세요.</p>
      </PageShell>
    </AppShell>
  );
};
