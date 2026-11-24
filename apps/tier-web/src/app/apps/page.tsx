import { supabase } from '@/lib/supabase';
import type { Metadata } from 'next';
import { fetchAppsPage } from './app-list';
import AppsClient from './AppsClient';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '전체 앱 목록',
  description: '다른티어에 등록된 앱을 이름과 설명으로 검색하고 Liquid Glass 대응 분류를 확인하세요.',
  openGraph: {
    title: '전체 앱 목록 - 다른티어',
    description: '다른티어에 등록된 앱을 검색하고 티어별 분류를 확인하세요.',
  },
};

export default async function AllAppsPage() {
  const firstPage = await fetchAppsPage(supabase).catch((error: unknown) => {
    console.error('Error fetching apps:', error);
    throw new Error('앱 목록을 불러오지 못했습니다. 다시 시도해 주세요.');
  });

  return (
    <div className="page-shell py-10 md:py-14">
      <AppsClient
        initialApps={firstPage.apps}
        initialTotalCount={firstPage.totalCount ?? 0}
        initialNextCursor={firstPage.nextCursor}
      />
    </div>
  );
}
