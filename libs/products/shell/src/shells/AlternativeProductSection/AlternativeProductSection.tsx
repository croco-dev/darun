'use client';

import { SectionHeader } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { useTranslations } from 'next-intl';
import { useAlternativeProductList } from '../../components/AlternativeProductList/useAlternativeProductList';
import { ProductAlternativeList } from '../../components/ProductAlternativeList';

type AlternativeProductSectionProps = {
  slug: string;
};

export const AlternativeProductSection = ({ slug }: AlternativeProductSectionProps) => {
  const t = useTranslations('Alternative');
  const { alternatives } = useAlternativeProductList({ slug });

  if (alternatives.length === 0) {
    return (
      <section className="flex flex-col gap-5 py-4 md:py-6">
        <SectionHeader title={t('more.title')} subtitle={t('more.description')} />
        <div data-testid="alt-empty" className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-surface-500 mb-4">{t('empty.title')}</p>
          <Link
            href="/categories"
            className="inline-flex items-center justify-center px-4 py-2 text-sm bg-surface-100 text-surface-700 rounded-md border border-surface-300 hover:bg-surface-200 transition-colors font-medium"
          >
            {t('empty.button')}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5 py-4 md:py-6">
      <SectionHeader title={t('more.title')} subtitle={t('more.description')} />
      <div className="[&_div.rounded-card]:hover:!shadow-card-hover [&_div.rounded-card]:hover:!border-brand-300 [&_div.bg-dark-100]:!bg-surface-200 [&_div.bg-dark-400]:!bg-surface-300 [&_div.bg-dark-400]:!h-px [&_p.text-dark-500]:!text-sm [&_p.text-dark-500]:!text-surface-600 [&_p.text-dark-500]:!font-bold [&_p.text-dark-900]:!text-base [&_p.text-dark-900]:!text-surface-900 [&_p.text-dark-900]:!font-bold [&_p.text-dark-600]:!text-sm [&_p.text-dark-600]:!text-surface-500 [&_p.text-dark-600]:!font-normal [&_span.text-dark-500]:!text-surface-400">
        <ProductAlternativeList slug={slug} />
      </div>
    </section>
  );
};
