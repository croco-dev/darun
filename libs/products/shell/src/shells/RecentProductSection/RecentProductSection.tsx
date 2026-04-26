'use client';

import { Link } from '@darun/utils-router';
import { useTranslations } from 'next-intl';
import { SectionHeader, SectionWrapper } from '@darun/ui';
import { RecentProductList } from '../../components';

export const RecentProductSection = () => {
  const t = useTranslations();

  return (
    <SectionWrapper background="subtle" spacing="md" className="home-motion">
      <div className="flex w-full flex-col gap-6">
        <SectionHeader
          title={t('home.recent.title')}
          subtitle={t('Main.recentSection.description')}
          moreLink={
            <Link
              href="/search"
              className="text-sm font-semibold text-brand-700 transition-colors duration-200 ease-out hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--home-bg-section-alt)] motion-reduce:transition-none"
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
