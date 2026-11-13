'use client';

import { SectionHeader } from '@darun/ui';
import { useTranslations } from 'next-intl';
import { ProductCompany } from '../../components';

type ProductDetailCompanySectionProps = { slug: string };

export const ProductDetailCompanySection = ({ slug }: ProductDetailCompanySectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <section
      className="flex flex-col gap-4 scroll-mt-[var(--product-section-offset,8rem)] md:gap-5"
      id="company-info"
      tabIndex={-1}
    >
      <SectionHeader title={t('company.title')} subtitle={t('company.description')} />
      <ProductCompany slug={slug} />
    </section>
  );
};
