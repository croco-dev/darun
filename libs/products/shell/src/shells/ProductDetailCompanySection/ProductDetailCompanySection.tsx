'use client';

import { SectionHeader } from '@darun/ui';
import { useTranslations } from 'next-intl';
import { ProductCompany } from '../../components';

type ProductDetailCompanySectionProps = { slug: string };

export const ProductDetailCompanySection = ({ slug }: ProductDetailCompanySectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <section className="flex flex-col gap-5 py-4 md:py-6" id="company-info">
      <SectionHeader title={t('company.title')} subtitle={t('company.description')} />
      <div className="[&_p.text-dark-500]:!text-sm [&_p.text-dark-500]:!text-dark-600 [&_div.bg-dark-400]:!bg-dark-300 [&_div.bg-dark-400]:!h-px [&_p.text-dark-700]:!w-16 [&_p.text-dark-700]:!text-dark-500 [&_p.text-dark-700]:!font-normal [&_p.text-dark-700]:!text-sm [&_p.text-dark-600]:!text-dark-600 [&_p.text-dark-600]:!text-sm">
        <ProductCompany slug={slug} />
      </div>
    </section>
  );
};
