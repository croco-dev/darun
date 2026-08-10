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
  ({ products }: ProductAlternativeListViewProps) => {
    const t = useTranslations('Alternative');

    if (!products) return <></>;

    return (
      <div className="flex flex-col gap-5">
        {products.map(product => (
          <div
            key={product.id}
            className="rounded-card border border-dark-200 bg-white px-5 py-4 shadow-card transition-colors hover:border-dark-400 hover:shadow-card-hover motion-reduce:transition-none"
          >
            <div className="flex w-full flex-col gap-3">
              <div className="flex flex-row justify-between items-center">
                <Link href={`/products/${product.slug}?from=related`} className="flex-1 min-w-0">
                  <ProductItem
                    name={product.name}
                    summary={product.summary}
                    logoSize={'small'}
                    logoUrl={product.logoUrl}
                    tagVariant={'circle'}
                    tags={product.tags.map(tag => tag.name)}
                  />
                </Link>
                <div className="flex-shrink-0 ml-2">
                  <CompareButton slug={product.slug} source="related" />
                </div>
              </div>
              <div className="my-[2px] h-px w-full bg-dark-100" />
              <div className="flex flex-col gap-6">
                {product.features && product.features.length > 0 && (
                  <>
                    <div className="flex flex-col gap-3">
                      <div className="flex w-fit flex-col gap-1">
                        <p className="text-base font-bold tracking-tight text-dark-500">{t('list.feature.title')}</p>
                        <div className="h-[2px] bg-dark-400" />
                      </div>
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
          </div>
        ))}
      </div>
    );
  }
);
