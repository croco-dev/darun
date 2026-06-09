'use client';

import { Button, SectionHeader } from '@darun/ui';
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
        <SectionHeader
          title={t('more.title')}
          subtitle={t('more.description')}
        />
        <div data-testid="alt-empty" className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg font-semibold text-dark-900 mb-2">{t('empty.title')}</p>
          <p className="text-base text-dark-600 mb-6">{t('empty.description')}</p>
          <Link
            href="/categories"
            className="inline-flex items-center justify-center px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
          >
            {t('empty.button')}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5 py-4 md:py-6">
      <SectionHeader
        title={t('more.title')}
        subtitle={t('more.description')}
      />
      <ProductAlternativeList slug={slug} />
    </section>
  );
};
