'use client';

import { ProductCompanyEditSection } from '@darun/admin-products-shell';
import { PageShell } from '@darun/ui-admin';

export const ProductCompanyEditPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <PageShell title={'서비스에 회사 연결하기'}>
    <ProductCompanyEditSection slug={slug} />
  </PageShell>
);
