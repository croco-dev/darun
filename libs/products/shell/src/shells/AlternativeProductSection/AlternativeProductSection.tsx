'use client';

import { SectionHeader } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { useLocale, useTranslations } from 'next-intl';
import { useAlternativeProductList } from '../../components/AlternativeProductList/useAlternativeProductList';
import { ProductAlternativeList } from '../../components/ProductAlternativeList';

type AlternativeProductSectionProps = {
  slug: string;
};

export const AlternativeProductSection = ({ slug }: AlternativeProductSectionProps) => {
  const t = useTranslations('Alternative');
  const locale = useLocale();
  const { alternatives } = useAlternativeProductList({ slug });

  if (alternatives.length === 0) {
    return (
      <section className="flex flex-col gap-4 py-4 md:gap-5 md:py-6">
        <SectionHeader title={t('more.title')} subtitle={t('more.description')} />
        <div
          data-testid="alt-empty"
          className="flex flex-col items-center justify-center rounded-card border border-dark-150 bg-surface-100 px-4 py-12 text-center"
        >
          <p className="mb-4 text-sm text-dark-500">{t('empty.title')}</p>
          <Link
            href={`/${locale}/search/product`}
            className="inline-flex items-center justify-center rounded-md border border-dark-300 bg-white px-4 py-2 text-sm font-medium text-dark-700 transition-colors hover:bg-surface-200"
          >
            {t('empty.button')}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 py-4 md:gap-5 md:py-6">
      <SectionHeader title={t('more.title')} subtitle={t('more.description')} />
      <ProductAlternativeList slug={slug} />
    </section>
  );
};
