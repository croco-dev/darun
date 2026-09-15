'use client';

import { PageShell } from '@darun/ui-admin';
import { useRouter } from 'next/navigation';
import { NewProductFormSection } from '../../../features/products/NewProductFormSection';

export default function NewProductPage() {
  const router = useRouter();

  return (
    <PageShell title={'새로운 서비스'} onBack={() => router.push('/products')}>
      <NewProductFormSection />
    </PageShell>
  );
}
