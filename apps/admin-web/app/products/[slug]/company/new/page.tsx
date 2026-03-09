'use client';

import { PageShell } from '@darun/ui-admin';
import { use } from 'react';
import { ProductCompanyEditSection } from '../../../../../features/products/ProductCompanyEditSection';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default function ProductCompanyEditPage({ params }: PageProps) {
  const { slug } = use(params);
  return (
    <PageShell title={'서비스에 회사 연결하기'}>
      <ProductCompanyEditSection slug={slug} />
    </PageShell>
  );
}
