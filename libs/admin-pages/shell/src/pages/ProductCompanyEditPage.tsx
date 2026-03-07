'use client';

import { ProductCompanyEditSection } from '@darun/admin-products-shell';
import { AppShell, PageShell } from '../uis';

export const ProductCompanyEditPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <AppShell>
    <PageShell title={'서비스에 회사 연결하기'}>
      <ProductCompanyEditSection slug={slug} />
    </PageShell>
  </AppShell>
);
