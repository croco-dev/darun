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

export const MagazineFeatureSection = ({
  articles = [],
}: MagazineFeatureSectionProps) => {
  const t = useTranslations();

  if (articles.length === 0) {
    return null;
  }

  return (
    <SectionWrapper background="subtle" spacing="md">
      <div className="flex w-full flex-col gap-6">
        <SectionHeader
          title={t('home.magazine.title')}
          moreLink={
            <Link
              href="/magazines"
              className="text-sm font-semibold text-brand-700 transition-colors duration-200 hover:text-brand-800"
            >
              {t('home.magazine.more')}
            </Link>
          }
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {articles.slice(0, 3).map((article) => (
            <div key={article.id} className="h-full [&>div]:h-full">
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
