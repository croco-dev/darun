import { AdminLoadingState, PageShell } from '@darun/ui-admin';
import { Suspense } from 'react';
import { LlmJobListSection } from '../../features/llm-jobs';

export const metadata = {
  title: 'LLM 작업 목록 - darun admin',
};

export default function LlmJobsPage() {
  return (
    <PageShell title="LLM 작업" backHref="/">
      <Suspense fallback={<AdminLoadingState />}>
        <LlmJobListSection />
      </Suspense>
    </PageShell>
  );
}
