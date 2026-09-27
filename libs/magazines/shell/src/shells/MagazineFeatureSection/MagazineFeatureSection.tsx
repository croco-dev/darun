'use client';

import { ArticleCard } from '@darun/magazines-feature';
import { BookOpen, Button, ChevronRight, SectionHeader, SectionWrapper } from '@darun/ui';
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
      <SectionWrapper background="white" spacing="md" className="border-t border-dark-100/70">
        <div className="flex w-full flex-col gap-5 md:gap-6">
          <SectionHeader title={t('home.magazine.title')} subtitle={t('home.magazine.description')} />
          <div
            data-testid="magazine-empty"
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-dark-200/80 bg-surface-50/50 px-6 py-12 text-center"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-500 shadow-2xs">
              <BookOpen size={22} className="stroke-[1.75]" aria-hidden="true" />
            </div>
            <p className="text-lg font-bold text-dark-900 break-keep">{t('Magazine.empty.title')}</p>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-dark-600 break-keep">
              {t('Magazine.empty.description')}
            </p>
            <Link
              href={`/${locale}/ranking`}
              className="mt-5 inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
            >
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
    <SectionWrapper background="white" spacing="md" className="border-t border-dark-100/70">
      <div className="flex w-full flex-col gap-5 md:gap-6">
        <SectionHeader
          title={t('home.magazine.title')}
          subtitle={t('home.magazine.description')}
          moreLink={
            <Link
              href={`/${locale}/ranking`}
              className="group inline-flex min-h-11 items-center gap-1 rounded-lg px-2 -mr-2 text-sm font-semibold text-dark-700 transition-colors duration-200 ease-out hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/70 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              <span>{t('home.magazine.more')}</span>
              <ChevronRight
                size={16}
                aria-hidden="true"
                className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </Link>
          }
        />
        <div role="group" aria-label={t('home.magazine.title')} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {articles.slice(0, 3).map(article => (
            <div key={article.id} className="h-full">
              <ArticleCard
                href={`/${locale}/magazines/${article.slug ?? article.id}`}
                thumbnailImageUri={article.thumbnailImageUri}
                category={article.category}
                title={article.title}
                summary={article.summary}
                author={article.author}
                date={article.publishedAt}
                locale={locale}
              />
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};

export type { MagazineFeatureArticle, MagazineFeatureSectionProps };
