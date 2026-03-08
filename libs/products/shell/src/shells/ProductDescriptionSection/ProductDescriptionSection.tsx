'use client';

import { useTranslations } from 'next-intl';
import { ProductDescription } from '../../components';

type ProductDescriptionSectionProps = {
  slug: string;
};
export const ProductDescriptionSection = ({ slug }: ProductDescriptionSectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <section className="gap-5 py-6 md:py-4 flex flex-col">
      <h2 className="darun-heading text-[24px] font-semibold text-dark-900 tracking-[-0.4px]" id="description">
        {t('description.title')}
      </h2>
      <ProductDescription slug={slug} />
    </section>
  );
};
