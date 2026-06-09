'use client';

import { useTranslations } from 'next-intl';
import { SectionHeader } from '@darun/ui';
import { ProductCompany } from '../../components';

type ProductDetailCompanySectionProps = { slug: string };

export const ProductDetailCompanySection = ({ slug }: ProductDetailCompanySectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <section className="flex flex-col gap-5 py-4 md:py-6" id="company-info">
      <SectionHeader
        title={t('company.title')}
        subtitle={t('company.description')}
      />
      <ProductCompany slug={slug} />
    </section>
  );
};
