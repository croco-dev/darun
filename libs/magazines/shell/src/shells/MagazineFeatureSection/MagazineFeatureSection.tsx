'use client';

import { ArticleCard } from '@darun/magazines-feature';
import { BookOpen, Button, SectionHeader, SectionWrapper } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { useLocale, useTranslations } from 'next-intl';

type MagazineFeatureArticle = {
  id: string;
  slug?: string;
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
  const locale = useLocale();

  if (articles.length === 0) {
    return (
      <SectionWrapper background="subtle" spacing="md">
        <div className="flex w-full flex-col gap-5 md:gap-6">
          <SectionHeader title={t('home.magazine.title')} />
          <div
            data-testid="magazine-empty"
            className="flex flex-col items-center justify-center rounded-card-lg border border-dark-150 bg-white px-6 py-12 text-center shadow-card"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-500 shadow-2xs">
              <BookOpen size={22} className="stroke-[1.75]" />
            </div>
            <p className="text-lg font-bold text-dark-900 break-keep">{t('Magazine.empty.title')}</p>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-dark-600 break-keep">
              {t('Magazine.empty.description')}
            </p>
            <Link href={`/${locale}/ranking`} className="mt-5 focus-visible:outline-none">
              <Button as="span" variant="shadow" color="primary">
                {t('Magazine.empty.cta')}
              </Button>
            </Link>
          </div>
        </div>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper background="subtle" spacing="md">
      <div className="flex w-full flex-col gap-5 md:gap-6">
        <SectionHeader title={t('home.magazine.title')} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {articles.slice(0, 3).map(article => (
            <div key={article.id} className="h-full">
              <Link
                href={`/${locale}/magazines/${article.slug ?? article.id}`}
                className="group block h-full rounded-card-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
              >
                <ArticleCard
                  thumbnailImageUri={article.thumbnailImageUri}
                  category={article.category}
                  title={article.title}
                  summary={article.summary}
                  author={article.author}
                  date={article.publishedAt}
                />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};

export type { MagazineFeatureArticle, MagazineFeatureSectionProps };
