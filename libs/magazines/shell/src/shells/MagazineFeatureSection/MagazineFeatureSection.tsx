'use client';

import { ArticleCard } from '@darun/magazines-feature';
import { Link } from '@darun/utils-router';
import { useTranslations } from 'next-intl';
import { SectionHeader } from '../../../../../shared/ui/src/components/SectionHeader';
import { SectionWrapper } from '../../../../../shared/ui/src/components/SectionWrapper';

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
      <SectionWrapper background="subtle" spacing="md" className="home-motion">
        <div className="flex w-full flex-col gap-6">
          <SectionHeader title={t('home.magazine.title')} />
          <div data-testid="magazine-empty" className="py-8 text-center">
            <p className="text-lg font-semibold text-dark-700">{t('magazine.empty.title')}</p>
            <p className="mt-1 text-sm text-dark-500">{t('magazine.empty.description')}</p>
            <Link
              href="/ranking"
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--home-bg-section-alt)]"
            >
              {t('magazine.empty.cta')}
            </Link>
          </div>
        </div>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper background="subtle" spacing="md" className="home-motion">
      <div className="flex w-full flex-col gap-6">
        <SectionHeader
          title={t('home.magazine.title')}
          moreLink={
            <Link
              href="/magazines"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 transition-colors duration-200 ease-out hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--home-bg-section-alt)] motion-reduce:transition-none"
            >
              {t('home.magazine.more')}
            </Link>
          }
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {articles.slice(0, 3).map(article => (
            <div
              key={article.id}
              className="group h-full transition-transform duration-200 ease-out hover:-translate-y-1 focus-within:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none [&>div]:h-full [&>div]:transition-[border-color,box-shadow] [&>div]:duration-200 [&>div]:ease-out hover:[&>div]:border-brand-200 hover:[&>div]:shadow-[0_24px_40px_-28px_rgba(53,63,174,0.24)] focus-within:[&>div]:border-brand-200 focus-within:[&>div]:shadow-[0_24px_40px_-28px_rgba(53,63,174,0.24)] motion-reduce:[&>div]:transition-none [&>div>div]:flex-col [&>div>div>img]:transition-transform [&>div>div>img]:duration-200 [&>div>div>img]:ease-out hover:[&>div>div>img]:scale-[1.02] focus-within:[&>div>div>img]:scale-[1.02] motion-reduce:[&>div>div>img]:transform-none motion-reduce:[&>div>div>img]:transition-none [&>div>div>img]:h-44 [&>div>div>img]:w-full [&>div>div>img]:max-w-none [&>div>div>div]:p-4 sm:[&>div>div>img]:h-48 md:[&>div>div]:flex-row md:[&>div>div>img]:h-36 md:[&>div>div>img]:w-auto md:[&>div>div>img]:max-w-[168px]"
            >
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
