import { AdminLoadingState, PageShell } from '@darun/ui-admin';
import { Suspense } from 'react';
import { LlmSettingFormSection } from '../../../features/settings/LlmSettingFormSection';

export default function LlmSettingPage() {
  return (
    <PageShell title="LLM 설정" backHref="/">
      <Suspense fallback={<AdminLoadingState />}>
        <LlmSettingFormSection />
      </Suspense>
    </PageShell>
  );
}
