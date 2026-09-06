'use client';

import { PageHeading, SectionWrapper } from '@darun/ui';
import { useTranslations } from 'next-intl';
import { RankedProductList } from '../../components';

export const RankedProductSection = () => {
  const t = useTranslations('Ranking');

  return (
    <SectionWrapper background="white" spacing="md">
      <div className="flex flex-col gap-5">
        <PageHeading title={t('section.title')} subtitle={t('section.description')} />
        <RankedProductList />
      </div>
    </SectionWrapper>
  );
};
