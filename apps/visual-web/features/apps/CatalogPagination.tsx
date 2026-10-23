import { Link } from '@darun/utils-router';

export function CatalogPagination({
  firstHref,
  nextHref,
  isFirstPage,
  loading = false,
  networkError = false,
  queryLengthError = false,
}: {
  firstHref: string;
  nextHref: string | null;
  isFirstPage: boolean;
  loading?: boolean;
  networkError?: boolean;
  queryLengthError?: boolean;
}) {
  if (loading || queryLengthError || (networkError && isFirstPage)) return null;
  return (
    <nav aria-label="결과 페이지" className="flex flex-wrap items-center justify-center gap-3">
      {!isFirstPage && (
        <Link
          href={firstHref}
          className="inline-flex min-h-11 items-center rounded-xl border border-dark-150 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
        >
          첫 페이지
        </Link>
      )}
      {!networkError && nextHref !== null && (
        <Link
          href={nextHref}
          className="inline-flex min-h-11 items-center rounded-xl border border-dark-150 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
        >
          다음 페이지
        </Link>
      )}
      <span role="status" className="w-full text-center text-xs text-dark-500">
        한 페이지씩 표시합니다. 이전 페이지는 브라우저 뒤로 가기로 돌아갈 수 있습니다.
      </span>
    </nav>
  );
}
