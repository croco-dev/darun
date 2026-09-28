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
        className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-dark-200/80 bg-surface-50/50 px-6 py-10 text-center"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-500 shadow-2xs">
          <Sparkles size={18} className="stroke-[1.75] shrink-0" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-dark-900 break-words [word-break:keep-all]">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div role="list" aria-label={t('title')} className="flex flex-col gap-3.5 sm:gap-4">
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
