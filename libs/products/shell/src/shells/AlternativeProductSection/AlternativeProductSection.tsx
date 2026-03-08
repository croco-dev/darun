'use client';

import { useTranslations } from 'next-intl';
import { ProductAlternativeList } from '../../components/ProductAlternativeList';

type AlternativeProductSectionProps = {
  slug: string;
};

export const AlternativeProductSection = ({ slug }: AlternativeProductSectionProps) => {
  const t = useTranslations('Alternative');

  return (
    <section className="gap-5 py-4 flex flex-col">
      <div className="flex flex-col gap-1">
        <h2 className="text-[24px] font-semibold text-dark-900 tracking-[-0.4px]">{t('more.title')}</h2>
        <p className="text-[16px] font-medium text-dark-600 tracking-[-0.4px]">{t('more.description')}</p>
      </div>
      <ProductAlternativeList slug={slug} />
    </section>
  );
};
