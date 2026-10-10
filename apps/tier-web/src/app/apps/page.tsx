import { supabase } from '@/lib/supabase';
import type { Metadata } from 'next';
import {
  APPS_PAGE_SIZE,
  APPS_SELECT,
  type AppListRow,
  getAppsPageRange,
  getHasNextPage,
  mapAppListRow,
} from './app-list';
import AppsClient from './AppsClient';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '전체 앱 목록',
  description:
    '앱스토어의 모든 앱을 한눈에 확인하고 검색할 수 있습니다. iOS 26 Liquid Glass 대응 여부에 따라 티어별로 분류된 앱들을 탐색하세요.',
  openGraph: {
    title: '전체 앱 목록 - 다른티어',
    description: '앱스토어의 모든 앱을 한눈에 확인하고 검색할 수 있습니다.',
  },
};

export default async function AllAppsPage() {
  const { from, to } = getAppsPageRange(1, APPS_PAGE_SIZE);
  const { data, error, count } = await supabase
    .from('apps')
    .select(APPS_SELECT, { count: 'exact' })
    .order('name', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to);

  if (error) {
    console.error('Error fetching apps:', error);
    return <div className="page-shell py-16">Error loading apps</div>;
  }

  const totalCount = count ?? 0;
  const initialApps = (data as AppListRow[] | null)?.map(mapAppListRow) ?? [];
  const initialHasNextPage = getHasNextPage(totalCount, to);

  return (
    <div className="page-shell py-10 md:py-14">
      <AppsClient initialApps={initialApps} initialTotalCount={totalCount} initialHasNextPage={initialHasNextPage} />
    </div>
  );
}
