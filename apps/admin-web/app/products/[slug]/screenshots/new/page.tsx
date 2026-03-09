'use client';

import { PageShell } from '@darun/ui-admin';
import { use } from 'react';
import { NewProductScreenshotFormSection } from '../../../../../features/products/NewProductScreenshotFormSection';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default function NewProductScreenshotPage({ params }: PageProps) {
  const { slug } = use(params);
  return (
    <PageShell title={'서비스에 스크린샷 추가'}>
      <div className="border border-gray-200 shadow-sm rounded-lg">
        <div className="border-b border-gray-200 px-4 py-2">
          <p className="font-medium">스크린샷</p>
        </div>
        <div className="px-4 mt-2 pb-4">
          <NewProductScreenshotFormSection productSlug={slug} />
        </div>
      </div>
    </PageShell>
  );
}
