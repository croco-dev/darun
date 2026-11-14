'use client';

import { SectionHeader } from '@darun/ui';
import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import { ProductFeatureList } from '../../components';
import { ProductSectionLoading } from '../../components/ProductSectionContent';

type ProductDetailFeatureSectionProps = {
  slug: string;
};

export const ProductDetailFeatureSection = ({ slug }: ProductDetailFeatureSectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <section
      className="flex flex-col gap-4 scroll-mt-[var(--product-section-offset,8rem)] md:gap-5"
      id="features"
      tabIndex={-1}
    >
      <SectionHeader title={t('feature.title')} subtitle={t('feature.description')} />
      <Suspense fallback={<ProductSectionLoading />}>
        <ProductFeatureList slug={slug} />
      </Suspense>
    </section>
  );
};
