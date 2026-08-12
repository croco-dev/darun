'use client';

import { SectionHeader } from '@darun/ui';
import { useTranslations } from 'next-intl';
import { ProductCompany } from '../../components';

type ProductDetailCompanySectionProps = { slug: string };

export const ProductDetailCompanySection = ({ slug }: ProductDetailCompanySectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <section className="flex flex-col gap-4 md:gap-5" id="company-info">
      <SectionHeader title={t('company.title')} subtitle={t('company.description')} />
      <div className="rounded-card-lg border border-dark-150 bg-white p-5 shadow-card md:p-6">
        <ProductCompany slug={slug} />
      </div>
    </section>
  );
};
