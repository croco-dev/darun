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
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-dark-200/80 bg-surface-50/50 px-6 py-14 text-center sm:py-16"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-dark-150/80 bg-gradient-to-br from-surface-50 to-surface-100 text-dark-500 shadow-2xs">
            <Layers size={24} className="stroke-[2]" />
          </div>
          <p className="text-base font-extrabold text-dark-900 break-keep">{t('empty.title')}</p>
          <p className="mt-1 max-w-sm text-sm text-dark-600 break-keep">{t('empty.description')}</p>
          <Link
            href={`/${locale}/search/product`}
            className="mt-6 group inline-flex rounded-xl transition-transform duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
          >
            <Button
              as="span"
              variant="shadow"
              color="primary"
              size="md"
              className="transition-all duration-200 active:scale-95"
            >
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
