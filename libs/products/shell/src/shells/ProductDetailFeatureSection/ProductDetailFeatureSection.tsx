'use client';

import { useTranslations } from 'next-intl';
import { ProductFeatureList } from '../../components';
type ProductDetailFeatureSectionProps = {
  slug: string;
};

export const ProductDetailFeatureSection = ({ slug }: ProductDetailFeatureSectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <section className="flex flex-col gap-5 py-4">
      <h2 id={'features'} className={`darun-heading font-semibold text-2xl text-dark-900 tracking-tighter`}>
        {t('feature.title')}
      </h2>
      <ProductFeatureList slug={slug} />
    </section>
  );
};
