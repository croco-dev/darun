'use client';

import { SectionHeader } from '@darun/ui';
import { useTranslations } from 'next-intl';
import { ProductDescription } from '../../components';

type ProductDescriptionSectionProps = {
  slug: string;
};

export const ProductDescriptionSection = ({ slug }: ProductDescriptionSectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <section className="flex flex-col gap-5 py-4 md:py-6" id="description">
      <SectionHeader title={t('description.title')} />
      <div className="[&_div]:text-dark-700">
        <ProductDescription slug={slug} />
      </div>
    </section>
  );
};
