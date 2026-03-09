'use client';

import { NewProductFeatureFormSection } from '@darun/admin-products-shell';
import { PageShell } from '@darun/ui-admin';

export const NewProductFeaturePage = ({ params: { slug } }: { params: { slug: string } }) => (
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
