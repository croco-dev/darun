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
          <p className="text-sm text-dark-500 mb-4">{t('empty.title')}</p>
          <Link
            href="/categories"
            className="inline-flex items-center justify-center px-4 py-2 text-sm bg-surface-100 text-dark-700 rounded-md border border-dark-300 hover:bg-surface-200 transition-colors font-medium"
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
      <div>
        <ProductAlternativeList slug={slug} />
      </div>
    </section>
  );
};
