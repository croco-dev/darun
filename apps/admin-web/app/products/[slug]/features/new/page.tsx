'use client';

import { PageShell } from '@darun/ui-admin';
import { use } from 'react';
import { NewProductFeatureFormSection } from '~/features/products/NewProductFeatureFormSection';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default function NewProductFeaturePage({ params }: PageProps) {
  const { slug } = use(params);
  return (
    <PageShell title={'서비스에 기능 추가'}>
      <div className="border border-gray-200 shadow-sm rounded-md">
        <div className="border-b px-4 py-2">
          <p className="font-medium">기능</p>
        </div>
        <div className="px-4 mt-2 pb-4">
          <NewProductFeatureFormSection productSlug={slug} />
        </div>
      </div>
    </PageShell>
  );
}
