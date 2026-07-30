'use client';

import { SectionHeader, SectionWrapper } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { useLocale, useTranslations } from 'next-intl';
import { RecentProductList } from '../../components';

export const RecentProductSection = () => {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <SectionWrapper background="white" spacing="md">
      <div className="flex w-full flex-col gap-5 md:gap-6">
        <SectionHeader
          title={t('home.recent.title')}
          subtitle={t('Main.recentSection.description')}
          moreLink={
            <Link
              href={`/${locale}/search/product`}
              className="text-sm font-semibold text-brand-700 transition-colors duration-200 ease-out hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:transition-none"
            >
              {t('home.category.more')}
            </Link>
          }
        />
        <RecentProductList />
      </div>
    </SectionWrapper>
  );
};
