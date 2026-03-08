'use client';

import { bind } from '@croco/utils-structure-react';
import { Link } from '@darun/utils-router';
import { useTranslations } from 'next-intl';
import { ProductFeatureGridList, ProductItem } from '../../uis';
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
          <Link key={product.id} href={`/products/${product.slug}`}>
            <div className="rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-[18px] py-4 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)]">
              <div className="flex w-full flex-col gap-3">
                <div className="flex flex-row">
                  <ProductItem
                    name={product.name}
                    summary={product.summary}
                    logoSize={'small'}
                    logoUrl={product.logoUrl}
                    tagVariant={'circle'}
                    tags={product.tags.map(tag => tag.name)}
                  />
                </div>
                <div className="my-[2px] h-px w-full bg-dark-100" />
                <div className="flex flex-col gap-6">
                  {product.features && product.features.length > 0 && (
                    <>
                      <div className="flex flex-col gap-3">
                        <div className="flex w-fit flex-col gap-1">
                          <p className="text-[16px] font-bold tracking-[-0.024em] text-dark-500">
                            {t('list.feature.title')}
                          </p>
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
          </Link>
        ))}
      </div>
    );
  }
);
