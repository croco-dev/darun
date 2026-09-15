'use client';

import { PageShell } from '@darun/ui-admin';
import { useRouter } from 'next/navigation';
import { MagazineWriteSection } from '../../../features/magazines/MagazineWriteSection/MagazineWriteSection';

export default function MagazineCreatePage() {
  const router = useRouter();

  return (
    <PageShell title={'새로운 매거진 발행'} onBack={() => router.push('/magazines')}>
      <MagazineWriteSection />
    </PageShell>
  );
}
