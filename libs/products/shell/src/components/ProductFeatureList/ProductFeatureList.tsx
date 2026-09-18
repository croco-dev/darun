'use client';

import { Sparkles } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { useTranslations } from 'next-intl';
import { FeatureItem } from '../../uis';
import { useProductFeatureList } from './useProductFeatureList';

export const ProductFeatureList = bind(useProductFeatureList, ({ features }) => {
  const t = useTranslations('ProductDetail.feature');

  if (features.length === 0) {
    return (
      <div
        data-testid="product-features-empty"
        className="flex flex-col items-center justify-center gap-2 rounded-card-lg border border-dashed border-dark-200 bg-surface-50/50 px-6 py-8 text-center"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-dark-150/80 bg-surface-100 text-dark-400 shadow-2xs">
          <Sparkles size={16} className="stroke-[1.75]" />
        </div>
        <p className="text-sm text-dark-500 break-keep">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {features.map(feature => (
        <FeatureItem
          key={feature.id}
          name={feature.name}
          emoji={feature.emoji || undefined}
          description={feature.summary ?? undefined}
          screenshots={feature.screenshots.map(item => ({
            id: item.id,
            imageAlt: item.imageAlt,
            imageUrl: item.imageUrl,
          }))}
        />
      ))}
    </div>
  );
});
