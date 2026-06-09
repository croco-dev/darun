'use client';

import { useTranslations } from 'next-intl';
import { SectionHeader } from '@darun/ui';
import { ProductDescription } from '../../components';

type ProductDescriptionSectionProps = {
  slug: string;
};

export const ProductDescriptionSection = ({ slug }: ProductDescriptionSectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <section className="flex flex-col gap-5 py-4 md:py-6" id="description">
      <SectionHeader title={t('description.title')} />
      <ProductDescription slug={slug} />
    </section>
  );
};
