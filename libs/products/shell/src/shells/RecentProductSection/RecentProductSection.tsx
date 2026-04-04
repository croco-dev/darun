'use client';

import { Link } from '@darun/utils-router';
import { useTranslations } from 'next-intl';
import { SectionHeader } from '../../../../../shared/ui/src/components/SectionHeader';
import { SectionWrapper } from '../../../../../shared/ui/src/components/SectionWrapper';
import { RecentProductList } from '../../components';

export const RecentProductSection = () => {
  const t = useTranslations();

  return (
    <SectionWrapper background="subtle" spacing="md">
      <div className="flex w-full flex-col gap-6">
        <SectionHeader
          title={t('home.recent.title')}
          subtitle={t('Main.recentSection.description')}
          moreLink={
            <Link
              href="/search"
              className="text-sm font-semibold text-brand-700 transition-colors duration-200 hover:text-brand-800"
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
