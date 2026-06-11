'use client';

import { ProductTagsForm } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { PageShell, AdminPanel, AdminSectionHeader, AdminSectionBody } from '@darun/ui-admin';
import Link from 'next/link';
import { use } from 'react';
import {
  ProductDetailAlternativeSection,
  ProductDetailCompanySection,
  ProductDetailDescriptionSection,
  ProductDetailFeatureSection,
  ProductDetailInfoSection,
  ProductDetailLinkSection,
} from '../../../features/products';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default function ProductDetailPage({ params }: PageProps) {
  const { slug } = use(params);
  return (
    <PageShell title={'서비스 상세'}>
      <ProductDetailInfoSection slug={slug} />
      <div className="flex flex-col gap-8 mt-6">
        <ProductDetailDescriptionSection slug={slug} />
        <ProductDetailFeatureSection slug={slug} />
        <ProductDetailLinkSection slug={slug} />
        <AdminPanel>
          <AdminSectionHeader
            title="스크린샷 관리"
            rightSide={
              <Link href={`/products/${slug}/screenshots/new`}>
                <Button type="button" variant="contained" color="primary">
                  스크린샷 추가
                </Button>
              </Link>
            }
          />
          <AdminSectionBody>
            미완
          </AdminSectionBody>
        </AdminPanel>
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
