import { Suspense } from 'react';
import { FlowExplorer } from '../../features/flows';
import { VisualLayout } from '../VisualLayout';

export const metadata = {
  title: 'UX 플로 — 다른 Visual',
  alternates: { canonical: '/flows' },
};

function FlowExplorerSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 md:gap-10 md:px-6">
      <div className="h-8 w-64 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" aria-hidden="true" />
      <span className="sr-only">플로 탐색을 준비하는 중</span>
    </div>
  );
}

export default function FlowsPage() {
  return (
    <VisualLayout>
      <main id="main-content" tabIndex={-1} className="w-full py-8 focus:outline-none md:py-12">
        <Suspense fallback={<FlowExplorerSkeleton />}>
          <FlowExplorer />
        </Suspense>
      </main>
    </VisualLayout>
  );
}
