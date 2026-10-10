import { Suspense } from 'react';
import { SavesExplorer } from '../../features/saves/SavesExplorer';
import { VisualLayout } from '../VisualLayout';

export const metadata = {
  title: '저장함 — 다른 Visual',
  alternates: { canonical: '/saves' },
};

function SavesExplorerSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 md:gap-10 md:px-6">
      <div className="h-8 w-48 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" aria-hidden="true" />
      <span className="sr-only">저장한 화면을 준비하는 중</span>
    </div>
  );
}

export default function SavesPage() {
  return (
    <VisualLayout>
      <main id="main-content" tabIndex={-1} className="w-full py-8 focus:outline-none md:py-12">
        <Suspense fallback={<SavesExplorerSkeleton />}>
          <SavesExplorer />
        </Suspense>
      </main>
    </VisualLayout>
  );
}
