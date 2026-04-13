'use client';

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
      <section className="gap-5 py-4 flex flex-col">
        <div className="flex flex-col gap-1">
          <h2 className="text-[24px] font-semibold text-dark-900 tracking-[-0.4px]">{t('more.title')}</h2>
          <p className="text-[16px] font-medium text-dark-600 tracking-[-0.4px]">{t('more.description')}</p>
        </div>
        <div data-testid="alt-empty" className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-[18px] font-semibold text-dark-900 mb-2">{t('empty.title')}</p>
          <p className="text-[16px] text-dark-600 mb-6">{t('empty.description')}</p>
          <Link
            href="/categories"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            {t('empty.button')}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="gap-5 py-4 flex flex-col">
      <div className="flex flex-col gap-1">
        <h2 className="text-[24px] font-semibold text-dark-900 tracking-[-0.4px]">{t('more.title')}</h2>
        <p className="text-[16px] font-medium text-dark-600 tracking-[-0.4px]">{t('more.description')}</p>
      </div>
      <ProductAlternativeList slug={slug} />
    </section>
  );
};
