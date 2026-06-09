'use client';

import { useTranslations } from 'next-intl';
import { SectionHeader } from '@darun/ui';
import { ProductPhotos } from '../../components';

type ProductPhotoSectionProps = { slug: string };

export const ProductPhotoSection = ({ slug }: ProductPhotoSectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <section className="flex flex-col gap-5 py-4 md:py-6" id="screenshot">
      <SectionHeader title={t('photo.title')} />
      <ProductPhotos slug={slug} />
    </section>
  );
};
