'use client';

import { PageShell, AdminPanel, AdminSectionHeader, AdminSectionBody } from '@darun/ui-admin';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { NewProductLinkSection } from '../../../../../features/products/NewProductLinkSection';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default function NewProductLinkPage({ params }: PageProps) {
  const router = useRouter();
  const { slug } = use(params);
  return (
    <PageShell title={'서비스에 링크 추가'} onBack={() => router.push(`/products/${slug}`)}>
      <AdminPanel>
        <AdminSectionHeader title="링크" />
        <AdminSectionBody>
          <NewProductLinkSection productSlug={slug} />
        </AdminSectionBody>
      </AdminPanel>
    </PageShell>
  );
}
