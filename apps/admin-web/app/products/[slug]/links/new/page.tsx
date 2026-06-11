'use client';

import { PageShell, AdminPanel, AdminSectionHeader, AdminSectionBody } from '@darun/ui-admin';
import { use } from 'react';
import { NewProductLinkSection } from '../../../../../features/products/NewProductLinkSection';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default function NewProductLinkPage({ params }: PageProps) {
  const { slug } = use(params);
  return (
    <PageShell title={'서비스에 링크 추가'}>
      <AdminPanel>
        <AdminSectionHeader title="링크" />
        <AdminSectionBody>
          <NewProductLinkSection productSlug={slug} />
        </AdminSectionBody>
      </AdminPanel>
    </PageShell>
  );
}
