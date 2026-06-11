'use client';

import { PageShell, AdminPanel, AdminSectionHeader, AdminSectionBody } from '@darun/ui-admin';
import { use } from 'react';
import { NewProductFeatureFormSection } from '../../../../../features/products/NewProductFeatureFormSection';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default function NewProductFeaturePage({ params }: PageProps) {
  const { slug } = use(params);
  return (
    <PageShell title={'서비스에 기능 추가'}>
      <AdminPanel>
        <AdminSectionHeader title="기능" />
        <AdminSectionBody>
          <NewProductFeatureFormSection productSlug={slug} />
        </AdminSectionBody>
      </AdminPanel>
    </PageShell>
  );
}
