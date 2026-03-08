'use client';

import { useTranslations } from 'next-intl';
import { RankedProductList } from '../../components';

export const RankedProductSection = () => {
  const t = useTranslations('Ranking');

  return (
    <section className="flex flex-col gap-5 w-full py-4">
      <div className="flex flex-col gap-1">
        <h2 className="darun-heading text-[20px] md:text-[24px] font-semibold text-dark-900 tracking-[-0.4px]">
          {t('section.title')}
        </h2>
        <p className="text-[14px] md:text-[16px] font-medium text-dark-600 tracking-[-0.4px]">
          {t('section.description')}
        </p>
      </div>
      <RankedProductList />
    </section>
  );
};
