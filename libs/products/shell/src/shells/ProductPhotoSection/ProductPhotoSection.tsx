'use client';

import { SectionHeader } from '@darun/ui';
import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import { ProductPhotos } from '../../components';
import { ProductSectionLoading } from '../../components/ProductSectionContent';

type ProductPhotoSectionProps = { slug: string };

export const ProductPhotoSection = ({ slug }: ProductPhotoSectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <section
      className="flex flex-col gap-4 scroll-mt-[var(--product-section-offset,8rem)] md:gap-5"
      id="screenshot"
      tabIndex={-1}
    >
      <SectionHeader title={t('photo.title')} subtitle={t('photo.description')} />
      <Suspense fallback={<ProductSectionLoading />}>
        <ProductPhotos slug={slug} />
      </Suspense>
    </section>
  );
};
