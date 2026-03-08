'use client';

import { useTranslations } from 'next-intl';
import { ProductCompany } from '../../components';

type ProductDetailCompanySectionProps = { slug: string };

export const ProductDetailCompanySection = ({ slug }: ProductDetailCompanySectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <section className="flex flex-col gap-[20px] py-[16px]">
      <div className="flex flex-col gap-[6px]">
        <h2 className="darun-heading text-[24px] font-semibold text-dark-900 tracking-[-0.4px]" id="company-info">
          {t('company.title')}
        </h2>
        <p className="text-[15px] font-medium text-dark-600 tracking-[-0.06px]">{t('company.description')}</p>
      </div>
      <ProductCompany slug={slug} />
    </section>
  );
};
