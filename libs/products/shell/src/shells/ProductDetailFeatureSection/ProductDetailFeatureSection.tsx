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
    <section className="flex flex-col gap-5 py-4 md:py-6" id="features">
      <SectionHeader title={t('feature.title')} />
      <div className="[&>div>div]:!rounded-card [&>div>div]:!shadow-card [&>div>div]:!border-dark-300 [&_div.border-black\/10]:!border-dark-300 [&_div.bg-dark-100]:!bg-surface-100 [&_div.bg-dark-100]:!rounded-md [&_p.text-dark-900]:!text-base [&_p.text-dark-900]:!text-dark-900 [&_p.text-dark-900]:!font-bold [&_p.text-dark-600]:!text-sm [&_p.text-dark-600]:!text-dark-500 [&_p.text-dark-600]:!font-normal [&_img]:!border-dark-300 [&_img]:!rounded-md">
        <ProductFeatureList slug={slug} />
      </div>
    </section>
  );
};
