'use client';

import { Maximize2, Sparkles } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import Zoom from 'react-medium-image-zoom';
import { useProductPhotos } from './useProductPhotos';

import 'react-medium-image-zoom/dist/styles.css';

type ProductPhotosViewProps = {
  photos: ReturnType<typeof useProductPhotos>['photos'];
};

const ProductPhotoItem = ({ photo }: { photo: { imageUrl: string; imageAlt: string } }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="flex h-56 w-72 sm:h-64 sm:w-80 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-dark-200 bg-surface-100 p-4 text-center">
        <Sparkles size={18} className="text-dark-400 stroke-[1.75]" aria-hidden="true" />
        <span className="text-xs text-dark-500 break-keep">{photo.imageAlt}</span>
      </div>
    );
  }

  return (
    <div className="group relative shrink-0 snap-start">
      <Zoom>
        <Image
          src={photo.imageUrl}
          alt={photo.imageAlt}
          width={600}
          height={220}
          onError={() => setHasError(true)}
          className="h-56 sm:h-64 w-auto rounded-xl border border-dark-150/90 bg-white object-contain p-1 shadow-2xs transition-all duration-200 hover:border-dark-300 hover:shadow-md cursor-zoom-in"
        />
      </Zoom>
      <div className="pointer-events-none absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg bg-dark-900/70 text-white opacity-80 backdrop-blur-sm transition-opacity duration-200 sm:opacity-0 group-hover:opacity-100">
        <Maximize2 size={13} className="stroke-[2.25]" aria-hidden="true" />
      </div>
    </div>
  );
};

export const ProductPhotos = bind(useProductPhotos, ({ photos }: ProductPhotosViewProps) => {
  const t = useTranslations('ProductDetail');
  const locale = useLocale();

  if (!photos || photos.length === 0) {
    return (
      <div
        data-testid="product-photos-empty"
        className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-dark-200/80 bg-surface-50/50 px-6 py-10 text-center"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-500 shadow-2xs">
          <Sparkles size={18} className="stroke-[1.75]" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-dark-900 break-keep">{t('photo.empty')}</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-card-lg border border-dark-150 bg-white p-4 shadow-card sm:p-5 md:p-6">
      <div className="mb-3.5 flex items-center justify-between border-b border-dark-150/70 pb-3">
        <span className="text-xs font-semibold text-dark-700">{t('photo.title')}</span>
        <span
          role="status"
          aria-label={
            locale === 'ko'
              ? `총 ${photos.length}개의 제품 미리보기 이미지`
              : `Total ${photos.length} product preview ${photos.length === 1 ? 'image' : 'images'}`
          }
          className="rounded-lg border border-dark-150/80 bg-surface-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-dark-700 shadow-2xs"
        >
          {locale === 'ko'
            ? `${photos.length}개 미리보기`
            : `${photos.length} ${photos.length === 1 ? 'Preview' : 'Previews'}`}
        </span>
      </div>
      {photos && (
        <div
          role="region"
          aria-label={t('photo.title')}
          tabIndex={0}
          className="flex w-full gap-3.5 overflow-x-auto px-0.5 pb-2 scrollbar-hide snap-x snap-mandatory scroll-smooth scroll-pl-1 touch-pan-x rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
        >
          {photos.map(photo => (
            <ProductPhotoItem key={photo.imageUrl} photo={photo} />
          ))}
        </div>
      )}
    </div>
  );
});
