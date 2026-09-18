'use client';

import { Maximize2, Sparkles } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import Zoom from 'react-medium-image-zoom';
import { useProductPhotos } from './useProductPhotos';

import 'react-medium-image-zoom/dist/styles.css';

type ProductPhotosViewProps = {
  photos: ReturnType<typeof useProductPhotos>['photos'];
};

export const ProductPhotos = bind(useProductPhotos, ({ photos }: ProductPhotosViewProps) => {
  const t = useTranslations('ProductDetail');

  if (!photos || photos.length === 0) {
    return (
      <div
        data-testid="product-photos-empty"
        className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-dark-200/80 bg-surface-50/50 px-6 py-10 text-center"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-dark-150/80 bg-gradient-to-br from-surface-50 to-surface-100 text-dark-500 shadow-2xs">
          <Sparkles size={18} className="stroke-[1.75]" />
        </div>
        <p className="text-sm font-semibold text-dark-900 break-keep">{t('photo.empty')}</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-card-lg border border-dark-150 bg-white p-4 shadow-card sm:p-5 md:p-6">
      <div className="mb-3.5 flex items-center justify-between border-b border-dark-100/80 pb-3">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <span className="text-2xs font-semibold uppercase tracking-wider text-dark-400 select-none">
          {photos.length} {photos.length === 1 ? 'Preview' : 'Previews'}
        </span>
      </div>
      {photos && (
        <div className="flex w-full gap-3.5 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory scroll-smooth scroll-pl-1 touch-pan-x">
          {photos.map(photo => (
            <div
              key={photo.imageUrl}
              className="group relative shrink-0 snap-start transition-transform duration-200 ease-out hover:-translate-y-1 motion-reduce:transform-none"
            >
              <Zoom>
                <Image
                  src={photo.imageUrl}
                  alt={photo.imageAlt}
                  width={600}
                  height={220}
                  className="h-56 sm:h-64 w-auto rounded-xl border border-dark-150/90 bg-white object-contain p-1 shadow-2xs transition-all duration-200 hover:border-dark-300 hover:shadow-md cursor-zoom-in"
                />
              </Zoom>
              <div className="pointer-events-none absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg bg-dark-900/70 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                <Maximize2 size={13} className="stroke-[2.25]" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
