'use client';

import { SectionHeader } from '@darun/ui';
import { useTranslations } from 'next-intl';
import { ProductCompany } from '../../components';

type ProductDetailCompanySectionProps = { slug: string };

export const ProductDetailCompanySection = ({ slug }: ProductDetailCompanySectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <section className="flex flex-col gap-4 py-4 md:gap-5 md:py-6" id="company-info">
      <SectionHeader title={t('company.title')} subtitle={t('company.description')} />
      <div className="rounded-card border border-dark-150 bg-white p-5 shadow-card">
        <ProductCompany slug={slug} />
      </div>
    </section>
  );
};
