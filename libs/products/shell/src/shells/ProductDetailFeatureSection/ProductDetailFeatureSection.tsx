'use client';

import { useTranslations } from 'next-intl';
import { SectionHeader } from '@darun/ui';
import { ProductFeatureList } from '../../components';

type ProductDetailFeatureSectionProps = {
  slug: string;
};

export const ProductDetailFeatureSection = ({ slug }: ProductDetailFeatureSectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <section className="flex flex-col gap-5 py-4 md:py-6" id="features">
      <SectionHeader title={t('feature.title')} />
      <ProductFeatureList slug={slug} />
    </section>
  );
};
