import { DeleteAppButton } from '@/components/admin/DeleteAppButton';
import { MemoEditor } from '@/components/admin/MemoEditor';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  type AdminPageSearchParams,
  buildAdminPageHref,
  escapeAdminSearchQuery,
  getAdminPageRange,
  getAdminPaginationMeta,
  normalizeAdminPageState,
} from './admin-page-state';
import { AdminSearchInput } from './AdminSearchInput';
import { AppStoreScrapeForm } from './AppStoreScrapeForm';
import { TierSelect } from './TierSelect';

interface AdminAppRecord {
  id: string;
  name: string;
  tiers: Array<{
    tier: number | null;
  }> | null;
  memos: Array<{
    content: string | null;
  }> | null;
}

interface AdminPageProps {
  searchParams: Promise<AdminPageSearchParams>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const supabase = await createClient();
  const pageState = normalizeAdminPageState(await searchParams);
  const { from, to } = getAdminPageRange(pageState.page, pageState.pageSize);

  let queryBuilder = supabase.from('apps').select(
    `
      id,
      name,
      tiers (
        tier
      ),
      memos (
        content
      )
    `,
    { count: 'exact' }
  );

  if (pageState.query) {
    queryBuilder = queryBuilder.ilike('name', `%${escapeAdminSearchQuery(pageState.query)}%`);
  }

  const { data, count, error } = await queryBuilder
    .order('name', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const totalCount = count ?? 0;
  const pagination = getAdminPaginationMeta(totalCount, pageState.page, pageState.pageSize);

  if (pageState.page > pagination.totalPages) {
    redirect(
      buildAdminPageHref({
        query: pageState.query,
        page: pagination.totalPages,
      })
    );
  }

  const apps =
    (data as AdminAppRecord[] | null)?.map(app => ({
      id: app.id,
      name: app.name,
      tier: app.tiers?.[0]?.tier || 0,
      memo: app.memos?.[0]?.content || '',
    })) || [];

  const previousPageHref = buildAdminPageHref({
    query: pageState.query,
    page: pagination.currentPage - 1,
  });
  const nextPageHref = buildAdminPageHref({
    query: pageState.query,
    page: pagination.currentPage + 1,
  });
  const paginationButtonClassName = (isDisabled: boolean) =>
    cn(buttonVariants({ variant: 'glass', size: 'sm' }), isDisabled && 'pointer-events-none opacity-50');

  return (
    <div className="page-shell py-8 md:py-10">
      <section className="space-y-2 border-b border-border pb-6 md:pb-8">
        <p className="section-label">관리자</p>
        <h1 className="editorial-display text-[1.9rem] text-foreground md:text-[2.2rem]">앱 관리</h1>
        <p className="text-sm leading-6 text-muted-foreground">티어, 메모, 삭제 액션을 한 화면에서 관리합니다.</p>
      </section>

      <div className="space-y-4 pt-6 md:pt-8">
        <AppStoreScrapeForm />

        <Card variant="default" className="gap-3 p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <AdminSearchInput initialQuery={pageState.query} />
            <div className="space-y-1 text-sm text-muted-foreground md:text-right">
              <p className="font-medium text-foreground">총 {totalCount}개 앱</p>
              <p>
                {pagination.start === 0 ? '검색 결과 없음' : `${pagination.start}-${pagination.end} / ${totalCount}`}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">앱 이름 기준 검색, 이름순 정렬</p>
        </Card>

        <div className="overflow-hidden rounded-[var(--radius-glass-panel)] border border-border bg-background">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">앱 이름</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">현재 티어</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">티어 변경</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">메모</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">삭제</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((app, index) => (
                  <tr key={app.id} className={index !== apps.length - 1 ? 'border-b border-border' : undefined}>
                    <td className="px-4 py-4 align-top">
                      <Link href={`/apps/${app.id}`} className="font-medium text-foreground hover:text-primary">
                        {app.name.length > 60 ? `${app.name.substring(0, 60)}...` : app.name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 align-top text-muted-foreground">
                      {app.tier === 0 ? 'No Tier' : `Tier ${app.tier}`}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <form>
                        <TierSelect appId={app.id} initialTier={app.tier} />
                      </form>
                    </td>
                    <td className="min-w-[240px] px-4 py-4 align-top">
                      <form>
                        <MemoEditor appId={app.id} initialContent={app.memo} />
                      </form>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <DeleteAppButton appId={app.id} appName={app.name} />
                    </td>
                  </tr>
                ))}
                {apps.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      검색 조건에 맞는 앱이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            페이지 {pagination.currentPage} / {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={previousPageHref}
              aria-disabled={!pagination.hasPreviousPage}
              tabIndex={pagination.hasPreviousPage ? 0 : -1}
              className={paginationButtonClassName(!pagination.hasPreviousPage)}
            >
              이전
            </Link>
            <Link
              href={nextPageHref}
              aria-disabled={!pagination.hasNextPage}
              tabIndex={pagination.hasNextPage ? 0 : -1}
              className={paginationButtonClassName(!pagination.hasNextPage)}
            >
              다음
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
