'use client';

import { SectionHeader } from '@darun/ui';
import { useTranslations } from 'next-intl';
import { ProductPhotos } from '../../components';

type ProductPhotoSectionProps = { slug: string };

export const ProductPhotoSection = ({ slug }: ProductPhotoSectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <section className="flex flex-col gap-5 py-4 md:py-6" id="screenshot">
      <SectionHeader title={t('photo.title')} />
      <div className="[&_div.rounded-\[10px\]]:!rounded-card [&_div.rounded-\[10px\]]:!shadow-card [&_div.rounded-\[10px\]]:!border-dark-300 [&_div.rounded-\[10px\]]:!bg-white [&_img]:!border-dark-300 [&_img]:!rounded-md [&_p.text-dark-500]:!text-sm [&_p.text-dark-500]:!text-dark-500 [&_div.overflow-auto]:!overflow-x-auto">
        <ProductPhotos slug={slug} />
      </div>
    </section>
  );
};
