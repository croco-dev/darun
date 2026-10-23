import 'reflect-metadata';
import { type Drizzle } from '@darun/provider-database';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { PostgresqlProductDescriptionEvidenceAssembler } from '../repositories/PostgresqlProductDescriptionEvidenceAssembler';
import { PostgresqlProductDescriptionJobRepository } from '../repositories/PostgresqlProductDescriptionJobRepository';

const url = process.env.DESCRIPTION_EVIDENCE_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('isolated PostgreSQL description evidence (SKIPPED without DESCRIPTION_EVIDENCE_TEST_DATABASE_URL)', () => {
  let sql: Sql;
  let db: Drizzle;
  beforeAll(async () => {
    const target = new URL(url!);
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/darun_description_integrity') {
      throw new Error('Requires the isolated local darun_description_integrity database');
    }
    sql = postgres(url!, { max: 2, connect_timeout: 5 });
    db = drizzle(sql);
    await migrate(db, {
      migrationsFolder: resolve(__dirname, '../../../../../apps/graphql-api/scripts/migrations'),
    });
    await sql`insert into products (id, name, slug, summary, logo_url) values ('evidence-product', '메모', 'evidence-product', '원문 요약', 'https://example.com/logo') on conflict (id) do nothing`;
    await sql`delete from product_features where product_id = 'evidence-product'`;
    await sql`insert into product_links (id, product_id, title, icon_url, link, display_link) values ('evidence-link', 'evidence-product', '자료', '', 'https://example.com/guide', '첫 문구') on conflict (id) do update set display_link = excluded.display_link`;
  }, 30000);
  afterAll(async () => {
    if (sql) await sql.end({ timeout: 5 });
  });

  it('re-reads display text and feature phantoms through the real fresh adapter', async () => {
    const reader = new PostgresqlProductDescriptionEvidenceAssembler(db);
    const first = await reader.assemble('evidence-product');
    await sql`update product_links set display_link = '다른 문구' where id = 'evidence-link'`;
    await sql`insert into product_features (id, product_id, name, emoji, summary) values ('evidence-feature', 'evidence-product', '기능', 'x', '새 설명')`;
    const second = await reader.assemble('evidence-product');
    expect(second.evidenceHash).not.toBe(first.evidenceHash);
    expect(second.evidence.items).toContainEqual({
      id: 'feature:evidence-feature',
      kind: 'feature',
      title: '기능',
      text: '새 설명',
    });
    const repository = new PostgresqlProductDescriptionJobRepository(db);
    const job = await repository.createJob({ productId: 'evidence-product' });
    const claimed = await repository.claimJobLease({
      jobId: job.id,
      leaseToken: 'lease-evidence',
      leaseUntil: new Date(Date.now() + 60_000),
    });
    expect(claimed?.leaseToken).toBe('lease-evidence');
    const stored = await repository.completeJobLease(job.id, 'lease-evidence', 'completed', {
      evidenceHashVersion: second.evidenceHashVersion,
      evidenceHash: second.evidenceHash,
      baseDescriptionHash: second.baseDescriptionHash,
      candidateHtml: '<p>저장 후보</p>',
    });
    expect(stored?.evidenceHashVersion).toBe('v2');
    expect((await repository.findJobById(job.id))?.evidenceHash).toBe(second.evidenceHash);
  });

  it.each(['product_tags', 'product_links', 'product_screenshots', 'product_flows', 'product_research_jobs'])(
    'does not convert a real %s query error into empty evidence',
    async table => {
      const unavailable = `temporarily_unavailable_${table}`;
      await sql`alter table ${sql(table)} rename to ${sql(unavailable)}`;
      try {
        await expect(
          new PostgresqlProductDescriptionEvidenceAssembler(db).assemble('evidence-product')
        ).rejects.toMatchObject({
          code: 'EVIDENCE_READ_FAILED',
          retryable: true,
        });
      } finally {
        await sql`alter table ${sql(unavailable)} rename to ${sql(table)}`;
      }
    }
  );
});
