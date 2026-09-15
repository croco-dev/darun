'use client';

import { PageShell, AdminPanel, AdminSectionHeader, AdminSectionBody } from '@darun/ui-admin';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { NewProductScreenshotFormSection } from '../../../../../features/products/NewProductScreenshotFormSection';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default function NewProductScreenshotPage({ params }: PageProps) {
  const router = useRouter();
  const { slug } = use(params);
  return (
    <PageShell title={'서비스에 스크린샷 추가'} onBack={() => router.push(`/products/${slug}`)}>
      <AdminPanel>
        <AdminSectionHeader title="스크린샷" />
        <AdminSectionBody>
          <NewProductScreenshotFormSection productSlug={slug} />
        </AdminSectionBody>
      </AdminPanel>
    </PageShell>
  );
}
