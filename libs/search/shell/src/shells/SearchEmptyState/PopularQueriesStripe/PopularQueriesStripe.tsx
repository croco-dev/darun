import { Link } from '@darun/utils-router';
import { useLocale } from 'next-intl';

const POPULAR_QUERIES: Record<string, string[]> = {
  ko: ['프로덕트헌트', '노션', '피그마'],
  en: ['Product Hunt', 'Notion', 'Figma'],
};

export const PopularQueriesStripe = () => {
  const locale = useLocale();
  const queries = POPULAR_QUERIES[locale] ?? POPULAR_QUERIES.ko;

  return (
    <div
      data-testid="popular-queries-stripe"
      tabIndex={0}
      className="flex gap-2 overflow-x-auto px-1 py-1.5 scrollbar-hide scroll-smooth scroll-pl-1 touch-pan-x rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
      role="group"
      aria-label={locale === 'ko' ? '검색 예시' : 'Search examples'}
    >
      {queries.map(query => (
        <Link
          key={query}
          href={`/${locale}/search/product?query=${encodeURIComponent(query)}`}
          className="group inline-flex min-h-[36px] sm:min-h-0 shrink-0 items-center gap-1.5 rounded-full border border-dark-150 bg-white px-3.5 py-1.5 text-xs font-semibold text-dark-700 shadow-2xs transition-all duration-150 ease-out active:scale-[0.98] motion-reduce:transform-none hover:border-dark-300 hover:bg-surface-100 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
        >
          <span aria-hidden="true" className="font-bold text-dark-400 transition-colors group-hover:text-dark-600">
            #
          </span>
          <span className="whitespace-nowrap">{query}</span>
        </Link>
      ))}
    </div>
  );
};
