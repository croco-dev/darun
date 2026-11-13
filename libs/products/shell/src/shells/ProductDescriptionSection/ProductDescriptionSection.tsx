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
    <section
      className="flex flex-col gap-4 scroll-mt-[var(--product-section-offset,8rem)] md:gap-5"
      id="description"
      tabIndex={-1}
    >
      <SectionHeader title={t('description.title')} subtitle={t('description.description')} />
      <ProductDescription slug={slug} />
    </section>
  );
};
