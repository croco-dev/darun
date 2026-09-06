'use client';

import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useTranslations } from 'next-intl';
import { ProductFeatureGridList, ProductItem } from '../../uis';
import { CompareButton } from '../CompareButton';
import { useProductAlternativeList } from './useProductAlternativeList';

type ProductAlternativeListViewProps = ReturnType<typeof useProductAlternativeList>;

export const ProductAlternativeList = bind(
  useProductAlternativeList,
  ({ products, locale = 'ko' }: ProductAlternativeListViewProps & { locale?: string }) => {
    const t = useTranslations('Alternative');

    if (!products) return <></>;

    return (
      <div className="flex flex-col gap-5">
        {products.map(product => (
          <div
            key={product.id}
            className="rounded-card border border-dark-150 bg-white p-5 shadow-card transition-all hover:border-dark-200 hover:shadow-card-hover motion-reduce:transition-none"
          >
            <div className="flex w-full flex-col gap-4">
              <div className="flex flex-row items-start justify-between gap-4">
                <Link href={`/${locale}/products/${product.slug}?from=related`} className="min-w-0 flex-1">
                  <ProductItem
                    name={product.name}
                    summary={product.summary}
                    logoSize="small"
                    logoUrl={product.logoUrl}
                    tagVariant="circle"
                    tags={product.tags.map(tag => tag.name)}
                  />
                </Link>
                <div className="shrink-0 pt-1">
                  <CompareButton slug={product.slug} source="related" />
                </div>
              </div>
              {product.features && product.features.length > 0 && (
                <>
                  <div className="h-px w-full bg-dark-100" />
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-semibold text-dark-900">{t('list.feature.title')}</p>
                    <ProductFeatureGridList
                      features={product.features.map(item => ({
                        ...item,
                        summary: item.summary ?? undefined,
                      }))}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        <div className="flex justify-center pt-1">
          <Link
            href={`/${locale}/search/product`}
            className="inline-flex items-center justify-center rounded-md border border-dark-200 bg-white px-4 py-2 text-sm font-medium text-dark-700 transition-colors hover:bg-surface-100"
          >
            {t('empty.button')}
          </Link>
        </div>
      </div>
    );
  }
);
