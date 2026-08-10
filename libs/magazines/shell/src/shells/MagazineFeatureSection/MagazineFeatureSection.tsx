'use client';

import { ArticleCard } from '@darun/magazines-feature';
import { SectionHeader, SectionWrapper } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { useTranslations } from 'next-intl';

type MagazineFeatureArticle = {
  id: string;
  title: string;
  summary?: string;
  category?: string;
  author?: string;
  thumbnailImageUri?: string;
  publishedAt?: Date;
};

type MagazineFeatureSectionProps = {
  articles?: MagazineFeatureArticle[];
};

export const MagazineFeatureSection = ({ articles = [] }: MagazineFeatureSectionProps) => {
  const t = useTranslations();

  if (articles.length === 0) {
    return (
      <SectionWrapper background="subtle" spacing="md">
        <div className="flex w-full flex-col gap-6">
          <SectionHeader title={t('home.magazine.title')} />
          <div data-testid="magazine-empty" className="py-8 text-center">
            <p className="text-lg font-semibold text-dark-700">{t('magazine.empty.title')}</p>
            <p className="mt-1 text-sm text-dark-500">{t('magazine.empty.description')}</p>
            <Link
              href="/ranking"
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-100"
            >
              {t('magazine.empty.cta')}
            </Link>
          </div>
        </div>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper background="subtle" spacing="md">
      <div className="flex w-full flex-col gap-6">
        <SectionHeader
          title={t('home.magazine.title')}
          moreLink={
            <Link
              href="/magazines"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 transition-colors duration-200 ease-out hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-100 motion-reduce:transition-none"
            >
              {t('home.magazine.more')}
            </Link>
          }
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {articles.slice(0, 3).map(article => (
            <div key={article.id} className="group h-full">
              <ArticleCard
                thumbnailImageUri={article.thumbnailImageUri}
                category={article.category}
                title={article.title}
                summary={article.summary}
                author={article.author}
                date={article.publishedAt}
              />
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};

export type { MagazineFeatureArticle, MagazineFeatureSectionProps };
