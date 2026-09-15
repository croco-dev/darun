'use client';

import { PageShell, AdminPanel, AdminSectionHeader, AdminSectionBody } from '@darun/ui-admin';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { NewProductFeatureFormSection } from '../../../../../features/products/NewProductFeatureFormSection';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default function NewProductFeaturePage({ params }: PageProps) {
  const router = useRouter();
  const { slug } = use(params);
  return (
    <PageShell title={'서비스에 기능 추가'} onBack={() => router.push(`/products/${slug}`)}>
      <AdminPanel>
        <AdminSectionHeader title="기능" />
        <AdminSectionBody>
          <NewProductFeatureFormSection productSlug={slug} />
        </AdminSectionBody>
      </AdminPanel>
    </PageShell>
  );
}
