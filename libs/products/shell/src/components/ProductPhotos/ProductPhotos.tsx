'use client';

import { Sparkles } from '@darun/ui';
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
        className="flex min-h-32 flex-col items-center justify-center rounded-card-lg border border-dashed border-dark-200 bg-surface-50/50 px-6 py-8 text-center"
      >
        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-surface-100 text-dark-400">
          <Sparkles size={16} className="stroke-[1.75]" />
        </div>
        <p className="text-sm text-dark-500 break-keep">{t('photo.empty')}</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-card-lg border border-dark-150/80 bg-white p-4 shadow-card md:p-5">
      {photos && (
        <div className="flex w-full gap-3.5 overflow-x-auto pb-1 scrollbar-hide touch-pan-x">
          {photos.map(photo => (
            <div
              key={photo.imageUrl}
              className="shrink-0 transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transform-none"
            >
              <Zoom>
                <Image
                  src={photo.imageUrl}
                  alt={photo.imageAlt}
                  width={600}
                  height={220}
                  className="h-[220px] w-auto rounded-xl border border-dark-150/80 bg-surface-100 object-contain shadow-2xs transition-all duration-200 hover:border-dark-300 hover:shadow-sm"
                />
              </Zoom>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
