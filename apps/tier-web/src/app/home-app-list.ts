import { APPS_SELECT, type AppListItem } from './apps/app-list';

export {
  APPS_PAGE_SIZE,
  type AppListItem,
  type AppListRow,
  getAppsPageRange,
  getHasNextPage,
  mapAppListRow,
} from './apps/app-list';

export const HOME_APPS_SELECT = APPS_SELECT;

export const HOME_TIERED_APPS_SELECT = `
  id,
  name,
  description,
  icon_url,
  tiers!inner (
    tier
  )
`;

export function buildHomeTierFilter(tier: number) {
  if (tier === 0) {
    return 'tier.eq.0,tier.is.null';
  }

  return `tier.eq.${tier}`;
}

const appNameCollator = new Intl.Collator('en', {
  sensitivity: 'base',
  numeric: true,
});

export function compareHomeApps(a: AppListItem, b: AppListItem) {
  const nameComparison = appNameCollator.compare(a.name, b.name);

  if (nameComparison !== 0) {
    return nameComparison;
  }

  return a.id.localeCompare(b.id);
}

export function mergeHomeApps(lists: AppListItem[][]) {
  const mergedApps = lists.flat().sort(compareHomeApps);
  const uniqueApps: AppListItem[] = [];
  const seenAppIds = new Set<string>();

  for (const app of mergedApps) {
    if (seenAppIds.has(app.id)) {
      continue;
    }

    seenAppIds.add(app.id);
    uniqueApps.push(app);
  }

  return uniqueApps;
}
