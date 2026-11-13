'use client';

import { ArticleCard } from '@darun/magazines-feature';

type MagazineArticleGridProps = {
  articles: ReadonlyArray<{
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    backgroundImageUrl: string;
  }>;
  locale: string;
};

export function MagazineArticleGrid({ articles, locale }: MagazineArticleGridProps) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map(article => (
        <li key={article.id} className="min-w-0">
          <ArticleCard
            heading="h2"
            href={`/${locale}/magazines/${encodeURIComponent(article.slug)}`}
            title={article.title}
            summary={article.summary ?? undefined}
            thumbnailImageUri={article.backgroundImageUrl}
          />
        </li>
      ))}
    </ul>
  );
}
