'use client';

import { SectionHeader } from '@darun/ui';
import { useTranslations } from 'next-intl';
import { ProductFeatureList } from '../../components';

type ProductDetailFeatureSectionProps = {
  slug: string;
};

export const ProductDetailFeatureSection = ({ slug }: ProductDetailFeatureSectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <section className="flex flex-col gap-4 scroll-mt-32 md:gap-5" id="features">
      <SectionHeader title={t('feature.title')} />
      <ProductFeatureList slug={slug} />
    </section>
  );
};
