'use client';

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
      <div className="rounded-[10px] border border-[rgba(0,0,0,0.1)] px-4 py-4 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.10)]">
        <p className="text-sm text-dark-500">{t('photo.empty')}</p>
      </div>
    );
  }
  return (
    <div className="rounded-[10px] border border-[rgba(0,0,0,0.1)] px-2 py-2 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.10)]">
      {photos && (
        <div className="relative flex w-max gap-2 overflow-auto">
          {photos.map(photo => (
            <Zoom key={photo.imageUrl}>
              <Image
                src={photo.imageUrl}
                alt={photo.imageAlt}
                sizes="350px"
                fill={true}
                className="!relative !h-[220px] !w-auto rounded border border-[rgba(0,0,0,0.04)] object-contain"
              />
            </Zoom>
          ))}
        </div>
      )}
    </div>
  );
});
