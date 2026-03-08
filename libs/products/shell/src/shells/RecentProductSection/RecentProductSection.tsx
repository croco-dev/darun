'use client';

import { useTranslations } from 'next-intl';
import { RecentProductList } from '../../components';

export const RecentProductSection = () => {
  const t = useTranslations('Main');

  return (
    <section className="flex flex-col gap-5 w-full py-4">
      <div className="flex flex-col gap-1">
        <h2 className={`darun-heading font-semibold text-xl md:text-2xl text-dark-900 tracking-tight`}>
          {t('recentSection.title')}
        </h2>
        <h2 className={`font-medium text-sm md:text-base text-dark-600 tracking-tight`}>
          {t('recentSection.description')}
        </h2>
      </div>
      <RecentProductList />
    </section>
  );
};
