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
    <section className="flex flex-col gap-4 md:gap-5" id="description">
      <SectionHeader title={t('description.title')} />
      <div className="rounded-card-lg border border-dark-150 bg-white p-5 shadow-card md:p-6">
        <ProductDescription slug={slug} />
      </div>
    </section>
  );
};
