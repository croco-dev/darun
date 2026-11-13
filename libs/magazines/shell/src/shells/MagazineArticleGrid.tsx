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

function getCoverUrl(value: string): string | undefined {
  // Covers uploaded by the editor use Cloudinary. Keep other stored URLs out of the public list.
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && url.origin === 'https://res.cloudinary.com' && !url.username && !url.password) {
      return url.href;
    }
  } catch {
    return undefined;
  }
}

export function MagazineArticleGrid({ articles, locale }: MagazineArticleGridProps) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map(article => {
        // A literal terminal ".md" selects the Markdown representation in middleware.
        const slug = encodeURIComponent(article.slug).replace(/\.md$/, '%2Emd');
        return (
          <li key={article.id} className="min-w-0">
            <ArticleCard
              heading="h2"
              href={`/${locale}/magazines/${slug}`}
              title={article.title}
              summary={article.summary ?? undefined}
              thumbnailImageUri={getCoverUrl(article.backgroundImageUrl)}
            />
          </li>
        );
      })}
    </ul>
  );
}
