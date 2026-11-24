import type { SupabaseClient } from '@supabase/supabase-js';

export const APPS_PAGE_SIZE = 24;
const APPS_COUNT_TIMEOUT_MS = 5000;

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
  tiers: AppTierRow | null;
};

export type AppListItem = {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  tier: number;
};

export type AppsCursor = Pick<AppListItem, 'name' | 'id'>;

export function mapAppListRow(app: AppListRow): AppListItem {
  return {
    id: app.id,
    name: app.name,
    description: app.description,
    iconUrl: app.icon_url,
    tier: app.tiers?.tier ?? 0,
  };
}

export function normalizeAppsSearchTerm(value: string) {
  return value.trim();
}

export function escapeAppsSearchQuery(value: string) {
  return value
    .replaceAll('\\', String.raw`\\`)
    .replaceAll('%', String.raw`\%`)
    .replaceAll('_', String.raw`\_`);
}

export function buildAppsSearchFilter(searchTerm: string) {
  // Escape LIKE literals first, then quote the whole pattern for PostgREST's OR grammar.
  const quotedPattern = quotePostgrestValue(`%${escapeAppsSearchQuery(searchTerm)}%`);

  return `name.ilike.${quotedPattern},description.ilike.${quotedPattern}`;
}

function quotePostgrestValue(value: string) {
  const escaped = value.replaceAll('\\', String.raw`\\`).replaceAll('"', String.raw`\"`);
  return `"${escaped}"`;
}

export async function fetchAppsPage(
  supabase: SupabaseClient,
  { after, searchTerm = '', tier }: { after?: AppsCursor | null; searchTerm?: string; tier?: number } = {}
) {
  const search = normalizeAppsSearchTerm(searchTerm);
  let columns = APPS_SELECT;
  if (tier === 0) columns = `${APPS_SELECT},assigned_tier:tiers()`;
  else if (tier !== undefined) columns = APPS_SELECT.replace('tiers (', 'tiers!inner (');
  function filteredQuery(head = false) {
    let query = supabase.from('apps').select(columns, { head, count: head || !after ? 'exact' : undefined });
    // Tier 0 includes explicit zero and apps without a tier assignment.
    if (tier === 0) query = query.gt('assigned_tier.tier', 0).is('assigned_tier', null);
    else if (tier !== undefined) query = query.eq('tiers.tier', tier);
    if (search) query = query.or(buildAppsSearchFilter(search));
    return query;
  }

  let page = filteredQuery();
  if (after) {
    const name = quotePostgrestValue(after.name);
    const id = quotePostgrestValue(after.id);
    page = page.or(`name.gt.${name},and(name.eq.${name},id.gt.${id})`);
  }
  const countController = after ? new AbortController() : null;
  const countTimer = countController ? setTimeout(() => countController.abort(), APPS_COUNT_TIMEOUT_MS) : undefined;

  try {
    // Rows remain usable when the independent count request fails or times out.
    const countRequest = countController
      ? filteredQuery(true)
          .abortSignal(countController.signal)
          .then(
            ({ count, error }) => (error ? null : count),
            () => null
          )
      : null;
    const result = await page
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .limit(APPS_PAGE_SIZE + 1)
      .overrideTypes<AppListRow[], { merge: false }>();
    if (result.error) throw new Error(result.error.message);

    const rows = result.data ?? [];
    const last = rows[APPS_PAGE_SIZE - 1];
    return {
      apps: rows.slice(0, APPS_PAGE_SIZE).map(mapAppListRow),
      totalCount: countRequest ? await countRequest : (result.count ?? 0),
      nextCursor: rows.length > APPS_PAGE_SIZE ? { name: last.name, id: last.id } : null,
    };
  } finally {
    clearTimeout(countTimer);
    countController?.abort();
  }
}

export function appendNewApps(current: AppListItem[], incoming: AppListItem[]) {
  const seen = new Set(current.map(app => app.id));
  return [...current, ...incoming.filter(app => !seen.has(app.id))];
}
