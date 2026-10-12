import { ApplyProductDescriptionCandidate } from '@darun/products-domain';
import { Product } from '@darun/products-domain';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { categories } from '../entities/CategorySchema';
import { productDescriptionJobs } from '../entities/ProductDescriptionJobSchema';
import { productResearchJobs } from '../entities/ProductResearchJobSchema';
import { products } from '../entities/ProductSchema';
import { PostgresqlProductDescriptionApplyStore } from '../repositories/PostgresqlProductDescriptionApplyStore';
import { PostgresqlProductResearchJobRepository } from '../repositories/PostgresqlProductResearchJobRepository';
import { PostgresqlProductResearchMaterializationRepository } from '../repositories/PostgresqlProductResearchMaterializationRepository';

const DATABASE_URL = process.env['W3_DATABASE_URL'] ?? 'postgresql://darun:darun@localhost:55433/darun';

const maybeDescribe = process.env['W3_PG'] === '1' ? describe : describe.skip;

function unique(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
}

function completedResearchResult(officialUrl: string) {
  const source = {
    id: 's1',
    title: '공식 소개',
    url: officialUrl,
    hostname: new URL(officialUrl).hostname,
    snippet: '공식 소개 문장입니다',
    extraSnippets: [],
    relationToInput: 'INPUT_HOST_MATCH' as const,
  };
  return {
    version: 1 as const,
    originalUrl: officialUrl,
    identity: {
      name: {
        value: 'W3 Prod',
        anchors: [{ sourceId: 's1', excerpt: '공식 소개' }],
        evidenceType: 'INPUT_HOST' as const,
      },
      suggestedSlug: 'w3-prod',
    },
    summary: null,
    categoryCandidates: [],
    features: [],
    tags: [],
    companyCandidate: null,
    alternativeCandidates: [],
    sources: [source],
    warnings: [],
    sourceSnapshotHash: 'snap',
    promptVersion: 'research-v1',
    model: 'fake',
  };
}

maybeDescribe('W3 atomic apply/materialize (isolated PG)', () => {
  let sql: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle>;
  let createdIds: { products: string[]; descJobs: string[]; researchJobs: string[]; categories: string[] };

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { prepare: false, max: 10 });
    db = drizzle(sql);
    createdIds = { products: [], descJobs: [], researchJobs: [], categories: [] };
    await db.execute('select 1');
  });

  afterAll(async () => {
    if (createdIds) {
      for (const id of createdIds.descJobs) {
        await db
          .delete(productDescriptionJobs)
          .where(eq(productDescriptionJobs.id, id))
          .catch(() => {});
      }
      for (const id of createdIds.researchJobs) {
        await db
          .delete(productResearchJobs)
          .where(eq(productResearchJobs.id, id))
          .catch(() => {});
      }
      for (const id of createdIds.products) {
        await db
          .delete(products)
          .where(eq(products.id, id))
          .catch(() => {});
      }
      for (const id of createdIds.categories) {
        await db
          .delete(categories)
          .where(eq(categories.id, id))
          .catch(() => {});
      }
    }
    await sql?.end({ timeout: 5 });
  });

  async function seedProduct(overrides: Partial<typeof products.$inferInsert> = {}) {
    const slug = unique('w3');
    const rows = await db
      .insert(products)
      .values({
        name: 'W3 Prod',
        slug,
        summary: '요약',
        logoUrl: 'https://example.com/logo.png',
        description: '<p>base</p>',
        categoryIds: [],
        ...overrides,
      })
      .returning();
    const row = rows[0]!;
    createdIds.products.push(row.id);
    return row;
  }

  async function seedDescJob(productId: string, candidateHtml: string) {
    const { computeSha256, normalizeString } = await import('@darun/products-domain');
    const rows = await db
      .insert(productDescriptionJobs)
      .values({
        productId,
        status: 'completed',
        message: 'done',
        evidenceHash: computeSha256(
          JSON.stringify({
            productId,
            productName: 'W3 Prod',
            summary: '요약',
            categories: [],
            features: [],
            tags: [],
            links: [],
            screenshots: [],
            flows: [],
            research: [],
          })
        ),
        baseDescriptionHash: computeSha256(normalizeString('<p>base</p>')),
        candidateHtml,
      })
      .returning();
    const row = rows[0]!;
    createdIds.descJobs.push(row.id);
    return row;
  }

  it('W3-A1: concurrent applies of one job produce one change (second alreadyApplied)', async () => {
    const product = await seedProduct();
    const job = await seedDescJob(product.id, '<p>candidates are byte-identical</p>');

    const storeOf = (session: ReturnType<typeof drizzle>) =>
      new PostgresqlProductDescriptionApplyStore(
        session as never,
        {
          assemble: async () => ({
            evidence: { productId: product.id, productName: 'W3 Prod', items: [] },
            evidenceHash: job.evidenceHash!,
            baseDescriptionHash: job.baseDescriptionHash!,
          }),
        } as never
      );
    const productRepoOf = (session: ReturnType<typeof drizzle>) => ({
      findOneById: async (id: string) => {
        const rows = await session.select().from(products).where(eq(products.id, id)).limit(1);
        const row = rows[0];
        return row
          ? new Product({
              ...row,
              ownedCompanyId: row.ownedCompanyId ?? undefined,
              description: row.description ?? undefined,
              publishedAt: row.publishedAt ?? undefined,
              updatedAt: row.updatedAt ?? undefined,
              categoryIds: row.categoryIds ?? [],
            })
          : null;
      },
    });
    const jobRepoStub = { findJobById: async () => null, markApplied: async () => null };

    const sqlA = postgres(DATABASE_URL, { prepare: false, max: 2 });
    const sqlB = postgres(DATABASE_URL, { prepare: false, max: 2 });
    try {
      const dbA = drizzle(sqlA);
      const dbB = drizzle(sqlB);
      const useA = new ApplyProductDescriptionCandidate(
        productRepoOf(dbA) as never,
        jobRepoStub as never,
        { assemble: async () => null } as never,
        storeOf(dbA)
      );
      const useB = new ApplyProductDescriptionCandidate(
        productRepoOf(dbB) as never,
        jobRepoStub as never,
        { assemble: async () => null } as never,
        storeOf(dbB)
      );
      const [a, b] = await Promise.all([useA.execute({ jobId: job.id }), useB.execute({ jobId: job.id })]);
      const flags = [a.alreadyApplied, b.alreadyApplied].sort();
      expect(flags).toEqual([false, true]);
      const finalRows = await db.select().from(products).where(eq(products.id, product.id)).limit(1);
      expect(finalRows[0]?.description).toBe('<p>candidates are byte-identical</p>');
      const jobRows = await db
        .select()
        .from(productDescriptionJobs)
        .where(eq(productDescriptionJobs.id, job.id))
        .limit(1);
      expect(jobRows[0]?.appliedAt).not.toBeNull();
    } finally {
      await sqlA.end({ timeout: 5 });
      await sqlB.end({ timeout: 5 });
    }
  });

  it('W3-A2: marker failure after product update rolls back the full transaction', async () => {
    const product = await seedProduct({ description: '<p>rollback-base</p>' });
    const { computeSha256, normalizeString } = await import('@darun/products-domain');
    const baseHash = computeSha256(normalizeString('<p>rollback-base</p>'));
    const job = await seedDescJob(product.id, '<p>should-not-persist</p>');
    await db
      .update(productDescriptionJobs)
      .set({ baseDescriptionHash: baseHash })
      .where(eq(productDescriptionJobs.id, job.id));

    const failingStore = new PostgresqlProductDescriptionApplyStore(
      db as never,
      {
        assemble: async () => ({
          evidence: { productId: product.id, productName: 'W3 Prod', items: [] },
          evidenceHash: job.evidenceHash!,
          baseDescriptionHash: baseHash,
        }),
      } as never
    );
    const failing = new ApplyProductDescriptionCandidate(
      {
        findOneById: async () =>
          new Product({ id: product.id, slug: 'x', name: 'n', summary: 's', logoUrl: 'https://example.com/l.png' }),
      } as never,
      { findJobById: async () => null, markApplied: async () => null } as never,
      { assemble: async () => null } as never,
      new Proxy(failingStore, {
        get(target, prop, receiver) {
          if (prop === 'markAppliedIfUnappliedLocked') {
            return async () => {
              throw new Error('injected job-marker failure');
            };
          }
          const value = Reflect.get(target, prop, receiver);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      })
    );
    await expect(failing.execute({ jobId: job.id })).rejects.toThrow('injected job-marker failure');
    const rows = await db.select().from(products).where(eq(products.id, product.id)).limit(1);
    expect(rows[0]?.description).toBe('<p>rollback-base</p>');
    const jobRows = await db
      .select()
      .from(productDescriptionJobs)
      .where(eq(productDescriptionJobs.id, job.id))
      .limit(1);
    expect(jobRows[0]?.appliedAt).toBeNull();
  });

  it('W3-A3: stale apply after human edit is rejected and the edit survives', async () => {
    const product = await seedProduct();
    const job = await seedDescJob(product.id, '<p>stale-candidate</p>');
    // 두 번째 커넥션의 human edit: description 변경.
    await db.update(products).set({ description: '<p>human edit</p>' }).where(eq(products.id, product.id));

    const { computeSha256, normalizeString } = await import('@darun/products-domain');
    const store = new PostgresqlProductDescriptionApplyStore(
      db as never,
      {
        assemble: async () => ({
          evidence: { productId: product.id, productName: 'W3 Prod', items: [] },
          evidenceHash: job.evidenceHash!,
          baseDescriptionHash: computeSha256(normalizeString('<p>human edit</p>')),
        }),
      } as never
    );
    const usecase = new ApplyProductDescriptionCandidate(
      {
        findOneById: async () =>
          new Product({ id: product.id, slug: 'x', name: 'n', summary: 's', logoUrl: 'https://example.com/l.png' }),
      } as never,
      { findJobById: async () => null, markApplied: async () => null } as never,
      { assemble: async () => null } as never,
      store
    );
    await expect(usecase.execute({ jobId: job.id })).rejects.toThrow('다시 생성해 주세요');
    const rows = await db.select().from(products).where(eq(products.id, product.id)).limit(1);
    expect(rows[0]?.description).toBe('<p>human edit</p>');
  });

  it('W3-A4: concurrent materialize with different slugs yields exactly one product', async () => {
    const catRows = await db
      .insert(categories)
      .values({ slug: unique('w3cat'), labelKo: '카테고리', labelEn: 'Category' })
      .returning();
    createdIds.categories.push(catRows[0]!.id);
    const officialUrl = `https://w3-${Date.now().toString(36)}.example.com/`;
    const requestKey = `w3:${Date.now().toString(36)}:${Math.floor(Math.random() * 1e6)}`;
    const jobRows = await db
      .insert(productResearchJobs)
      .values({
        requestKey,
        officialUrl,
        status: 'completed',
        resultJson: JSON.stringify(completedResearchResult(officialUrl)),
      })
      .returning();
    const job = jobRows[0]!;
    createdIds.researchJobs.push(job.id);
    const verifyJob = await db.select().from(productResearchJobs).where(eq(productResearchJobs.id, job.id)).limit(1);
    expect(verifyJob).toHaveLength(1);

    const sqlA = postgres(DATABASE_URL, { prepare: false, max: 2 });
    const sqlB = postgres(DATABASE_URL, { prepare: false, max: 2 });
    try {
      const repoA = new PostgresqlProductResearchMaterializationRepository(drizzle(sqlA) as never);
      const repoB = new PostgresqlProductResearchMaterializationRepository(drizzle(sqlB) as never);
      const base = {
        researchJobId: job.id,
        name: 'W3 Prod',
        summary: '요약',
        logoUrl: 'https://example.com/logo.png',
        officialUrl,
        categoryIds: [catRows[0]!.id],
        features: [],
        tags: [],
      };
      const [a, b] = await Promise.allSettled([
        repoA.materialize({ ...base, slug: unique('w3a') }),
        repoB.materialize({ ...base, slug: unique('w3b') }),
      ]);
      const fulfilled = [a, b].filter(r => r.status === 'fulfilled');
      const finalJob = await new PostgresqlProductResearchJobRepository(db as never).findById(job.id);
      expect(fulfilled).toHaveLength(2);
      const results = fulfilled.map(
        r => (r as PromiseFulfilledResult<{ product: Product; alreadyCreated: boolean }>).value
      );
      const winners = results.filter(r => !r.alreadyCreated);
      const stales = results.filter(r => r.alreadyCreated);
      expect(winners).toHaveLength(1);
      expect(stales).toHaveLength(1);
      expect(stales[0]!.product.id).toBe(winners[0]!.product.id);
      expect(finalJob?.materializedProductId).toBe(winners[0]!.product.id);
      expect(finalJob?.materializedProductId).not.toBeNull();
      if (finalJob?.materializedProductId) {
        createdIds.products.push(finalJob.materializedProductId);
      }
      const mine = await db
        .select({ id: products.id, slug: products.slug })
        .from(products)
        .where(eq(products.id, winners[0]!.product.id))
        .limit(5);
      // 승자의 product 정확히 하나만 존재한다(고아 행 없음).
      expect(mine).toHaveLength(1);
      expect(mine[0]!.id).toBe(finalJob?.materializedProductId);
    } finally {
      await sqlA.end({ timeout: 5 });
      await sqlB.end({ timeout: 5 });
    }
  });
});
