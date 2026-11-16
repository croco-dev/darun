export interface MagazinePage<T> {
  edges: { node: T }[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
}

/** Sitemap and Markdown must fail rather than publish a partial magazine inventory. */
export async function collectMagazinePages<T>(fetchPage: (after?: string) => Promise<MagazinePage<T>>): Promise<T[]> {
  const articles: T[] = [];
  const cursors = new Set<string>();
  let after: string | undefined;
  while (true) {
    const page = await fetchPage(after);
    articles.push(...page.edges.map(edge => edge.node));
    if (!page.pageInfo.hasNextPage) return articles;
    const cursor = page.pageInfo.endCursor;
    if (!page.edges.length || !cursor || cursors.has(cursor)) throw new Error('Magazine pagination did not advance');
    cursors.add(cursor);
    after = cursor;
  }
}
