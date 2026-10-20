import { Suspense } from 'react';
import { AppExplorer } from '../../features/apps';
import { VisualLayout } from '../VisualLayout';

export const metadata = {
  title: '앱 — 다른 Visual',
  alternates: { canonical: '/apps' },
};

function AppExplorerSkeleton() {
  return (
    <div className="w-full py-8 md:py-12">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 md:gap-10 md:px-6">
        <div className="h-8 w-64 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" aria-hidden="true" />
        <span className="sr-only">앱 탐색을 준비하는 중</span>
      </div>
    </div>
  );
}

export default function AppsPage() {
  return (
    <VisualLayout>
      <div className="w-full py-8 md:py-12">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 md:gap-10 md:px-6">
          <Suspense fallback={<AppExplorerSkeleton />}>
            <AppExplorer />
          </Suspense>
        </div>
      </div>
    </VisualLayout>
  );
}
