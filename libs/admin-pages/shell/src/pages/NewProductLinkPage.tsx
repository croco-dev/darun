'use client';

import { NewProductLinkSection } from '@darun/admin-products-shell';
import { PageShell } from '@darun/ui-admin';

export const NewProductLinkPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <PageShell title={'서비스에 링크 추가'}>
    <div className="border border-gray-200 shadow-sm rounded-lg">
      <div className="border-b border-gray-200 px-4 py-2">
        <p className="font-medium">링크</p>
      </div>
      <div className="px-4 mt-2 pb-4">
        <NewProductLinkSection productSlug={slug} />
      </div>
    </div>
  </PageShell>
);
