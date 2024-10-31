'use client';

import { AppShell, PageShell } from '@uis';
import { ProductCompanyEditSection } from '../products/shells/ProductCompanyEditSection';

export const ProductCompanyEditPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <AppShell>
    <PageShell title={'서비스에 회사 연결하기'}>
      <ProductCompanyEditSection slug={slug} />
    </PageShell>
  </AppShell>
);
