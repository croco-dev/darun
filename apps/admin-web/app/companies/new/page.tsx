'use client';

import { PageShell } from '@darun/ui-admin';
import { useRouter } from 'next/navigation';
import { NewCompanyFormSection } from '../../../features/companies/NewCompanyFormSection/NewCompanyFormSection';

export default function NewCompanyPage() {
  const router = useRouter();

  return (
    <PageShell title={'새로운 기업 추가'} onBack={() => router.push('/companies')}>
      <NewCompanyFormSection />
    </PageShell>
  );
}
