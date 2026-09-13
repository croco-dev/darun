'use client';

import { PageShell } from '@darun/ui-admin';
import { LlmSettingFormSection } from '../../../features/settings/LlmSettingFormSection';

export default function LlmSettingPage() {
  return (
    <PageShell title="LLM 설정">
      <LlmSettingFormSection />
    </PageShell>
  );
}
