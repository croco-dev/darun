'use client';

import { Breadcrumb, PageHeading, SectionWrapper } from '@darun/ui';
import { useLocale, useTranslations } from 'next-intl';
import { RankedProductList } from '../../components';

export const RankedProductSection = () => {
  const t = useTranslations('Ranking');
  const locale = useLocale();
  const isKo = locale === 'ko';

  return (
    <SectionWrapper background="white" spacing="md">
      <div className="flex flex-col gap-5 sm:gap-6 md:gap-8">
        <Breadcrumb
          data-testid="breadcrumb-ranking"
          items={[
            { label: isKo ? '홈' : 'Home', href: `/${locale}/` },
            { label: isKo ? '인기 랭킹' : 'Ranking', ariaCurrent: 'page' },
          ]}
        />
        <PageHeading title={t('section.title')} subtitle={t('section.description')} />
        <RankedProductList />
      </div>
    </SectionWrapper>
  );
};
