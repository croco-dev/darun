'use client';

import { useSuspenseQuery } from '@apollo/client/react';
import { ProductBySlugOnAlternativeProductListDocument } from '@darun/provider-graphql';
import { Button, Layers, SectionHeader } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { useLocale, useTranslations } from 'next-intl';
import { Suspense, type ComponentProps } from 'react';
import { AlternativeProductList } from '../../components';
import {
  ProductSectionContent,
  ProductSectionLoading,
  productSectionQueryOptions,
} from '../../components/ProductSectionContent';

type ProductAlternativeSectionProps = {
  slug: string;
};

export const ProductAlternativeSection = ({ slug }: ProductAlternativeSectionProps) => {
  const t = useTranslations('Alternative');
  return (
    <section
      className="flex flex-col gap-5 scroll-mt-[var(--product-section-offset,8rem)]"
      id="alternatives"
      tabIndex={-1}
    >
      <SectionHeader title={t('section.title')} subtitle={t('section.description')} />
      <Suspense fallback={<ProductSectionLoading />}>
        <ProductAlternatives slug={slug} />
      </Suspense>
    </section>
  );
};

function ProductAlternatives({ slug }: ProductAlternativeSectionProps) {
  const locale = useLocale();
  const { data, error, refetch } = useSuspenseQuery(ProductBySlugOnAlternativeProductListDocument, {
    ...productSectionQueryOptions,
    variables: { slug, locale },
  });

  return (
    <ProductSectionContent error={error} refetch={refetch}>
      <ProductAlternativesContent slug={slug} locale={locale} alternatives={data?.productBySlug?.alternatives ?? []} />
    </ProductSectionContent>
  );
}

function ProductAlternativesContent({
  slug,
  locale,
  alternatives,
}: ComponentProps<typeof AlternativeProductList.ViewComponent>) {
  const t = useTranslations('Alternative');

  if (alternatives.length === 0) {
    return (
      <div
        data-testid="alt-empty"
        className="flex flex-col items-center justify-center rounded-card-lg border border-dashed border-dark-200 bg-surface-50/50 px-6 py-10 text-center"
      >
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-dark-150/80 bg-surface-100 text-dark-400 shadow-2xs">
          <Layers size={18} className="stroke-[2] shrink-0" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-dark-900 break-words [word-break:keep-all]">{t('empty.title')}</p>
        <p className="mt-1 max-w-xs text-xs text-dark-500 break-words [word-break:keep-all]">
          {t('empty.description')}
        </p>
        <Link
          href={`/${locale}/search/product`}
          className="mt-4 group inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
        >
          <Button
            as="span"
            variant="shadow"
            color="primary"
            size="sm"
            className="h-10 px-4 active:scale-[0.98] motion-reduce:transform-none"
          >
            {t('empty.button')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <AlternativeProductList.ViewComponent slug={slug} alternatives={alternatives} locale={locale} />
      <div className="flex justify-center pt-2">
        <Link
          href={`/${locale}/products/${encodeURIComponent(slug)}/alternatives`}
          className="group inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
        >
          <Button
            as="span"
            variant="shadow"
            color="secondary"
            size="md"
            className="h-10 sm:h-11 px-4 sm:px-5 transition-all duration-200 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none hover:border-dark-300 hover:bg-surface-100 hover:text-dark-950 hover:shadow-button-hover"
          >
            <div className="flex items-center justify-center gap-2">
              <Layers
                size={16}
                aria-hidden="true"
                className="shrink-0 text-dark-500 transition-all duration-200 group-hover:scale-110 group-hover:text-dark-900 motion-reduce:transform-none motion-reduce:transition-none"
              />
              <span>{t('section.moreButton')}</span>
            </div>
          </Button>
        </Link>
      </div>
    </>
  );
}
