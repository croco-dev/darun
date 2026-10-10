export const APPS_PAGE_SIZE = 24;

export const APPS_SELECT = `
  id,
  name,
  description,
  icon_url,
  tiers (
    tier
  )
`;

type AppTierRow = {
  tier: number | null;
};

export type AppListRow = {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  tiers: AppTierRow[] | null;
};

export type AppListItem = {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  tier: number;
};

export function getAppsPageRange(page: number, pageSize = APPS_PAGE_SIZE) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return { from, to };
}

export function mapAppListRow(app: AppListRow): AppListItem {
  return {
    id: app.id,
    name: app.name,
    description: app.description,
    iconUrl: app.icon_url,
    tier: app.tiers?.[0]?.tier ?? 0,
  };
}

export function normalizeAppsSearchTerm(value: string) {
  return value.trim();
}

export function escapeAppsSearchQuery(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_')
    .replaceAll(',', '\\,')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

export function buildAppsSearchFilter(searchTerm: string) {
  const escapedSearchTerm = escapeAppsSearchQuery(searchTerm);

  return `name.ilike.%${escapedSearchTerm}%,description.ilike.%${escapedSearchTerm}%`;
}

export function getHasNextPage(totalCount: number, to: number) {
  return totalCount > to + 1;
}
