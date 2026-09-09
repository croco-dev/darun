'use client';

import { Button, Layers, SectionHeader } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { useLocale, useTranslations } from 'next-intl';
import { AlternativeProductList } from '../../components';
import { useAlternativeProductList } from '../../components/AlternativeProductList/useAlternativeProductList';

type ProductAlternativeSectionProps = {
  slug: string;
};

export const ProductAlternativeSection = ({ slug }: ProductAlternativeSectionProps) => {
  const t = useTranslations('Alternative');
  const locale = useLocale();
  const { alternatives } = useAlternativeProductList({ slug });

  if (alternatives.length === 0) {
    return (
      <section className="flex flex-col gap-5 scroll-mt-32" id="alternatives">
        <SectionHeader title={t('section.title')} subtitle={t('section.description')} />
        <div
          data-testid="alt-empty"
          className="flex flex-col items-center justify-center rounded-card-lg border border-dark-150 bg-white px-6 py-10 text-center shadow-card"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-400 shadow-2xs">
            <Layers size={22} className="stroke-[2]" />
          </div>
          <p className="text-sm font-semibold text-dark-900 break-keep">{t('empty.title')}</p>
          <p className="mt-1 max-w-xs text-xs text-dark-500 break-keep">{t('empty.description')}</p>
          <Link href={`/${locale}/search/product`} className="mt-4">
            <Button variant="shadow" color="primary" size="sm">
              {t('empty.button')}
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5 scroll-mt-32" id="alternatives">
      <SectionHeader title={t('section.title')} subtitle={t('section.description')} />
      <AlternativeProductList slug={slug} />
      <div className="flex justify-center pt-2">
        <Link href={`/${locale}/products/${slug}/alternatives`}>
          <Button variant="shadow" color="secondary">
            <div className="flex items-center justify-center gap-2">
              <Layers size={16} className="shrink-0 text-dark-500" />
              <span>{t('section.moreButton')}</span>
            </div>
          </Button>
        </Link>
      </div>
    </section>
  );
};
