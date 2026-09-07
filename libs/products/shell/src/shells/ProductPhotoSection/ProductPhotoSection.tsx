'use client';

import { SectionHeader } from '@darun/ui';
import { useTranslations } from 'next-intl';
import { ProductPhotos } from '../../components';

type ProductPhotoSectionProps = { slug: string };

export const ProductPhotoSection = ({ slug }: ProductPhotoSectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <section className="flex flex-col gap-4 scroll-mt-32 md:gap-5" id="screenshot">
      <SectionHeader title={t('photo.title')} />
      <ProductPhotos slug={slug} />
    </section>
  );
};
