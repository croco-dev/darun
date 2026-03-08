'use client';

import { useTranslations } from 'next-intl';
import { ProductPhotos } from '../../components';

type ProductPhotoSectionProps = { slug: string };

export const ProductPhotoSection = ({ slug }: ProductPhotoSectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <section className="flex flex-col gap-5 py-4">
      <h2 id="screenshot" className="darun-heading font-semibold text-2xl text-dark-900 tracking-tighter">
        {t('photo.title')}
      </h2>
      <ProductPhotos slug={slug} />
    </section>
  );
};
