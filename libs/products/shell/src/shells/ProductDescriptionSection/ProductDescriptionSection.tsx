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
    <section className="flex flex-col gap-4 py-4 md:gap-5 md:py-6" id="description">
      <SectionHeader title={t('description.title')} />
      <div className="rounded-card border border-dark-150 bg-white p-5 shadow-card">
        <ProductDescription slug={slug} />
      </div>
    </section>
  );
};
