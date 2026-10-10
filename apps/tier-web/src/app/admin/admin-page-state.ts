const ADMIN_BASE_PATH = '/admin';

export const ADMIN_PAGE_SIZE = 25;

type AdminSearchParamValue = string | string[] | undefined;

export interface AdminPageSearchParams {
  query?: AdminSearchParamValue;
  page?: AdminSearchParamValue;
}

export interface AdminPageState {
  query: string;
  page: number;
  pageSize: number;
}

export interface AdminPaginationMeta {
  currentPage: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  start: number;
  end: number;
}

function getSingleParamValue(value: AdminSearchParamValue): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function normalizeAdminPageState(searchParams: AdminPageSearchParams): AdminPageState {
  const normalizedQuery = (getSingleParamValue(searchParams.query) ?? '').trim();
  const rawPage = getSingleParamValue(searchParams.page);
  const parsedPage = Number.parseInt(rawPage ?? '', 10);

  return {
    query: normalizedQuery,
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    pageSize: ADMIN_PAGE_SIZE,
  };
}

export function getAdminPageRange(page: number, pageSize = ADMIN_PAGE_SIZE) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return { from, to };
}

export function getAdminTotalPages(totalCount: number, pageSize = ADMIN_PAGE_SIZE) {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

export function getAdminPaginationMeta(
  totalCount: number,
  currentPage: number,
  pageSize = ADMIN_PAGE_SIZE
): AdminPaginationMeta {
  const totalPages = getAdminTotalPages(totalCount, pageSize);
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  if (totalCount === 0) {
    return {
      currentPage: 1,
      totalPages,
      hasPreviousPage: false,
      hasNextPage: false,
      start: 0,
      end: 0,
    };
  }

  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalCount);

  return {
    currentPage: safePage,
    totalPages,
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage < totalPages,
    start,
    end,
  };
}

export function buildAdminPageHref({ query, page }: { query?: string; page?: number }) {
  const params = new URLSearchParams();
  const normalizedQuery = query?.trim() ?? '';
  const normalizedPage = page && page > 1 ? page : 1;

  if (normalizedQuery) {
    params.set('query', normalizedQuery);
  }

  if (normalizedPage > 1) {
    params.set('page', normalizedPage.toString());
  }

  const queryString = params.toString();

  return queryString ? `${ADMIN_BASE_PATH}?${queryString}` : ADMIN_BASE_PATH;
}

export function escapeAdminSearchQuery(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}
