'use client';

import { useNavigate } from '@darun/utils-router';
import { useLocale } from 'next-intl';

const POPULAR_QUERIES: Record<string, string[]> = {
  ko: [
    '프로덕트헌트',
    '노션',
    '피그마',
    '슬랙',
    '깃허브',
    'Notion 대체',
    'Figma 대체',
    'AI 도구',
    '프로젝트 관리',
    '디자인 도구',
  ],
  en: [
    'Product Hunt',
    'Notion',
    'Figma',
    'Slack',
    'GitHub',
    'Notion alternatives',
    'Figma alternatives',
    'AI tools',
    'Project management',
    'Design tools',
  ],
};

export const PopularQueriesStripe = () => {
  const locale = useLocale();
  const navigate = useNavigate();
  const queries = POPULAR_QUERIES[locale] ?? POPULAR_QUERIES.ko;

  const handleClick = (query: string) => {
    const searchPath = `/${locale}/search/product`;
    navigate(`${searchPath}?query=${encodeURIComponent(query)}`);
  };

  return (
    <div
      data-testid="popular-queries-stripe"
      className="flex gap-2 overflow-x-auto scrollbar-hide"
      role="list"
      aria-label="Popular searches"
    >
      {queries.map(query => (
        <button
          key={query}
          type="button"
          role="listitem"
          onClick={() => handleClick(query)}
          className="inline-flex items-center rounded-full border border-dark-150 bg-white px-4 py-2 text-sm font-medium text-dark-700 transition-colors hover:border-dark-300 hover:bg-surface-100 hover:text-dark-900 focus-visible:border-dark-300 focus-visible:bg-surface-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/70 motion-reduce:transition-none"
        >
          {query}
        </button>
      ))}
    </div>
  );
};
