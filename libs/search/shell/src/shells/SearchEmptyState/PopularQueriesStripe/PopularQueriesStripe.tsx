"use client";

import { useNavigate } from "@darun/utils-router";
import { useLocale } from "next-intl";

const POPULAR_QUERIES: Record<string, string[]> = {
  ko: [
    "프로덕트헌트",
    "노션",
    "피그마",
    "슬랙",
    "깃허브",
    "Notion 대체",
    "Figma 대체",
    "AI 도구",
    "프로젝트 관리",
    "디자인 도구",
  ],
  en: [
    "Product Hunt",
    "Notion",
    "Figma",
    "Slack",
    "GitHub",
    "Notion alternatives",
    "Figma alternatives",
    "AI tools",
    "Project management",
    "Design tools",
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
      className="flex gap-2 overflow-x-auto py-1 scrollbar-hide"
      role="list"
      aria-label="Popular searches"
    >
      {queries.map((query) => (
        <button
          key={query}
          type="button"
          role="listitem"
          onClick={() => handleClick(query)}
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dark-150 bg-white px-3.5 py-1.5 text-xs font-semibold text-dark-700 shadow-2xs transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-dark-300 hover:bg-surface-100 hover:text-dark-900 hover:shadow-button-hover active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
        >
          <span className="text-dark-400 transition-colors group-hover:text-dark-600">
            #
          </span>
          <span>{query}</span>
        </button>
      ))}
    </div>
  );
};
