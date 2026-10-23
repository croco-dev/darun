import type { SupabaseClient } from '@supabase/supabase-js';
import {
  APPS_PAGE_SIZE,
  APPS_SELECT,
  type AppListRow,
  getAppsPageRange,
  getHasNextPage,
  mapAppListRow,
} from './apps/app-list';

export { type AppListItem } from './apps/app-list';

export function normalizeHomeTier(value: unknown): number {
  return typeof value === 'string' && /^[0-3]$/.test(value) ? Number(value) : 1;
}

export async function fetchHomeAppsPage(supabase: SupabaseClient, { page, tier }: { page: number; tier: number }) {
  const { from, to } = getAppsPageRange(page, APPS_PAGE_SIZE);
  // Anti-join excludes assigned tiers 1–3 without excluding explicit tier 0 or unassigned apps.
  let query =
    tier === 0
      ? supabase
          .from('apps')
          .select(`${APPS_SELECT},assigned_tier:tiers()`, { count: 'exact' })
          .gt('assigned_tier.tier', 0)
          .is('assigned_tier', null)
      : supabase
          .from('apps')
          .select(APPS_SELECT.replace('tiers (', 'tiers!inner ('), { count: 'exact' })
          .eq('tiers.tier', tier);
  query = query.order('name', { ascending: true }).order('id', { ascending: true });
  const { data, error, count } = await query.range(from, to).overrideTypes<AppListRow[], { merge: false }>();
  if (error) throw new Error(error.message);
  return {
    apps: data?.map(mapAppListRow) ?? [],
    totalCount: count ?? 0,
    hasNextPage: getHasNextPage(count ?? 0, to),
  };
}
