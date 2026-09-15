'use client';

import { ProductTagsForm } from '@darun/products-feature';
import { PageShell, AdminPanel, AdminSectionHeader, AdminSectionBody } from '@darun/ui-admin';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import {
  ProductDetailAlternativeSection,
  ProductDetailCompanySection,
  ProductDetailDescriptionSection,
  ProductDetailFeatureSection,
  ProductDetailInfoSection,
  ProductDetailLinkSection,
  ProductDetailScreenshotSection,
} from '../../../features/products';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default function ProductDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { slug } = use(params);
  return (
    <PageShell title={'서비스 상세'} onBack={() => router.push('/products')}>
      <ProductDetailInfoSection slug={slug} />
      <div className="flex flex-col gap-8 mt-6">
        <ProductDetailDescriptionSection slug={slug} />
        <ProductDetailFeatureSection slug={slug} />
        <ProductDetailLinkSection slug={slug} />
        <ProductDetailScreenshotSection slug={slug} />
        <ProductDetailAlternativeSection slug={slug} />
        <AdminPanel>
          <AdminSectionHeader title="태그 관리" />
          <AdminSectionBody>
            <ProductTagsForm slug={slug} />
          </AdminSectionBody>
        </AdminPanel>
        <ProductDetailCompanySection slug={slug} />
      </div>
    </PageShell>
  );
}
