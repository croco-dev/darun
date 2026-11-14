'use client';

import { useLocale } from 'next-intl';
import { Suspense } from 'react';
import { ProductLinks } from '../../components';
import { ProductSectionLoading } from '../../components/ProductSectionContent';

type ProductSummaryLinkProps = { slug: string };

export const ProductSummaryLink = ({ slug }: ProductSummaryLinkProps) => {
  const locale = useLocale();

  return (
    <div
      role="group"
      tabIndex={-1}
      aria-label={locale === 'ko' ? '공식 링크' : 'Official links'}
      className="flex flex-wrap items-center gap-2.5 empty:hidden"
    >
      <Suspense fallback={<ProductSectionLoading />}>
        <ProductLinks slug={slug} />
      </Suspense>
    </div>
  );
};
