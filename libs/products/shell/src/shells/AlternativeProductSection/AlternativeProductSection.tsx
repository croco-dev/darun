'use client';

import { Button, Layers, SectionHeader } from '@darun/ui';
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
      <section className="flex flex-col gap-4 md:gap-5">
        <SectionHeader title={t('more.title')} subtitle={t('more.description')} />
        <div
          data-testid="alt-empty"
          className="flex flex-col items-center justify-center rounded-card-lg border border-dark-150 bg-white px-6 py-14 text-center shadow-card"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-400 shadow-2xs">
            <Layers size={24} className="stroke-[2]" />
          </div>
          <p className="text-base font-semibold text-dark-900 break-keep">{t('empty.title')}</p>
          <p className="mt-1 max-w-sm text-sm text-dark-600 break-keep">{t('empty.description')}</p>
          <Link href={`/${locale}/search/product`} className="mt-6">
            <Button variant="shadow" color="primary" size="md">
              {t('empty.button')}
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 md:gap-5">
      <SectionHeader title={t('more.title')} subtitle={t('more.description')} />
      <ProductAlternativeList slug={slug} />
    </section>
  );
};
