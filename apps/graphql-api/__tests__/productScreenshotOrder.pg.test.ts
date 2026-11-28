import 'reflect-metadata';
import { PostgresqlProductRepository, PostgresqlProductScreenshotRepository } from '@darun/products-datasource';
import {
  GetProduct,
  GetProductScreenshots,
  GetPublishedProduct,
  ReorderProductScreenshots,
} from '@darun/products-domain';
import { ProductQueryResolver, ProductScreenshotOrderMutationResolver } from '@darun/products-feature/server';
import { AuthRole, createAuthChecker, createServer } from '@darun/utils-apollo-server';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';

const url = process.env.PRODUCT_SCREENSHOT_ORDER_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
const productId = 'gallery';
const original = ['a', 'b', 'c'];
const reordered = ['c', 'a', 'b'];

const reorderMutation = `
  mutation Reorder($productId: ID!, $orderedIds: [ID!]!, $expectedOrderIds: [ID!]!) {
    reorderProductScreenshots(productId: $productId, orderedIds: $orderedIds, expectedOrderIds: $expectedOrderIds)
  }
`;

suite('product screenshot ordering through Apollo and PostgreSQL', () => {
  let sql: ReturnType<typeof postgres>;
  let server: ReturnType<typeof createServer>;

  beforeAll(async () => {
    const target = new URL(url!);
    if (target.hostname !== '127.0.0.1' || target.pathname !== '/darun_screenshot_order') {
      throw new Error('Requires isolated local darun_screenshot_order database');
    }
    sql = postgres(url!, { connect_timeout: 5 });
    const db = drizzle(sql);
    await migrate(db, { migrationsFolder: resolve(__dirname, '../scripts/migrations') });
    const productRepository = new PostgresqlProductRepository(db);
    const screenshotsRepository = new PostgresqlProductScreenshotRepository(db);
    const query = Object.assign(Object.create(ProductQueryResolver.prototype), {
      productRepository,
      getProductUseCase: new GetProduct(productRepository),
      getPublishedProductUseCase: new GetPublishedProduct(productRepository),
      getProductScreenshotsUseCase: new GetProductScreenshots(screenshotsRepository),
    });
    const mutation = new ProductScreenshotOrderMutationResolver(new ReorderProductScreenshots(screenshotsRepository));
    server = createServer({
      options: {
        resolvers: [ProductQueryResolver, ProductScreenshotOrderMutationResolver],
        container: { get: type => (type === ProductQueryResolver ? query : mutation) },
        authChecker: createAuthChecker(),
      },
      config: { playground: false },
    });
    await server.start();
  }, 30_000);

  beforeEach(async () => {
    await sql`delete from product_screenshots`;
    await sql`delete from products`;
    await sql`insert into products (id, slug, name, summary, description, logo_url, published_at)
      values ('gallery', 'gallery', 'Gallery', '', '', '', now()), ('other', 'other', 'Other', '', '', '', now())`;
    await sql`insert into product_screenshots (id, product_id, image_url, image_alt, priority)
      values ('c', 'gallery', '/c.png', 'C', 0), ('a', 'gallery', '/a.png', 'A', 0),
             ('b', 'gallery', '/b.png', 'B', 0), ('x', 'other', '/x.png', 'X', 9)`;
  });

  afterAll(async () => {
    await server?.stop();
    await sql?.end();
  });

  async function execute(query: string, variables: Record<string, unknown> = {}, admin = true) {
    const { body } = await server.executeOperation(
      { query, variables },
      { contextValue: { getRoles: async () => (admin ? [AuthRole.Admin] : ['user']) } }
    );
    if (body.kind !== 'single') throw new Error('Expected single GraphQL result');
    return body.singleResult;
  }

  function reorder(orderedIds = reordered, expectedOrderIds = original, admin = true) {
    return execute(reorderMutation, { productId, orderedIds, expectedOrderIds }, admin);
  }

  const priorities = () => sql`select id, priority from product_screenshots order by id`;

  it('publishes the new reading order, cover and previews while retaining screenshot metadata and content revision', async () => {
    const initial = await execute(
      '{ tempProductBySlug(slug: "gallery") { screenshots { id } coverScreenshot { id } } }'
    );
    expect(initial.errors).toBeUndefined();
    expect(initial.data).toEqual({
      tempProductBySlug: { screenshots: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], coverScreenshot: { id: 'c' } },
    });
    const before = await sql`select content_revision from products where id = ${productId}`;
    const beforeMetadata = await sql`select id, image_url, image_alt, created_at from product_screenshots order by id`;

    const result = await reorder(['b', 'c', 'a']);
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ reorderProductScreenshots: true });

    const publicRead = await execute(
      '{ productBySlug(slug: "gallery") { screenshots { id } coverScreenshot { id } previewScreenshots { id } } }',
      {},
      false
    );
    expect(publicRead.errors).toBeUndefined();
    expect(publicRead.data).toEqual({
      productBySlug: {
        screenshots: [{ id: 'b' }, { id: 'c' }, { id: 'a' }],
        coverScreenshot: { id: 'b' },
        previewScreenshots: [{ id: 'b' }, { id: 'c' }, { id: 'a' }],
      },
    });
    expect(await priorities()).toEqual([
      { id: 'a', priority: 1 },
      { id: 'b', priority: 3 },
      { id: 'c', priority: 2 },
      { id: 'x', priority: 9 },
    ]);
    expect(await sql`select id, image_url, image_alt, created_at from product_screenshots order by id`).toEqual(
      beforeMetadata
    );
    expect(await sql`select content_revision from products where id = ${productId}`).toEqual(before);
    expect(await sql`select id from product_content_sync_intents where product_id = ${productId}`).toHaveLength(0);
  });

  it('rejects unauthorized, duplicate, missing and foreign IDs without changing any priorities', async () => {
    const before = await priorities();
    expect((await reorder(reordered, original, false)).errors?.[0]?.extensions?.code).toBe('UNAUTHORIZED');
    for (const ids of [
      ['c', 'c', 'a'],
      ['c', 'a'],
      ['c', 'x', 'a'],
    ]) {
      expect((await reorder(ids)).errors?.[0]?.extensions?.code).toBe('product/invalid-args');
    }
    expect((await reorder(['x', 'c', 'a'], ['a', 'x', 'c'])).errors?.[0]?.extensions?.code).toBe(
      'product-screenshot/order-changed'
    );
    expect(await priorities()).toEqual(before);
  });

  it('accepts only one concurrent reorder from the same snapshot and detects an added or removed screenshot', async () => {
    const otherOrder = ['b', 'a', 'c'];
    const results = await Promise.all([reorder(), reorder(otherOrder)]);
    const winningIndex = results.findIndex(result => result.data?.reorderProductScreenshots === true);
    expect(winningIndex).toBeGreaterThanOrEqual(0);
    expect(results[1 - winningIndex].errors?.[0]?.extensions?.code).toBe('product-screenshot/order-changed');
    const winningOrder = [reordered, otherOrder][winningIndex];
    expect(
      (await sql`select id from product_screenshots where product_id = ${productId} order by priority desc`).map(
        row => row.id
      )
    ).toEqual(winningOrder);

    await sql`insert into product_screenshots (id, product_id, image_url, image_alt) values ('d', ${productId}, '/d.png', 'D')`;
    const afterAdd = await priorities();
    expect((await reorder(original, winningOrder)).errors?.[0]?.extensions?.code).toBe(
      'product-screenshot/order-changed'
    );
    expect(await priorities()).toEqual(afterAdd);

    await sql`delete from product_screenshots where id = 'b'`;
    const afterDelete = await priorities();
    expect((await reorder(original, winningOrder)).errors?.[0]?.extensions?.code).toBe(
      'product-screenshot/order-changed'
    );
    expect(await priorities()).toEqual(afterDelete);
  });

  it('leaves the full old order intact when the database rejects a priority change', async () => {
    const before = await priorities();
    await sql`alter table product_screenshots add constraint fixture_priority_failure check (id <> 'b' or priority = 0)`;
    try {
      expect((await reorder()).errors?.[0]?.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
      expect(await priorities()).toEqual(before);
    } finally {
      await sql`alter table product_screenshots drop constraint fixture_priority_failure`;
    }
  });

  it('waits for a Product-first membership write and then rejects the old order', async () => {
    const before = await priorities();
    let pendingReorder: ReturnType<typeof reorder> | undefined;
    await sql.begin(async tx => {
      const [owner] = await tx<{ pid: number }[]>`
        select pg_backend_pid() as pid from products where id = ${productId} for update
      `;
      await tx`insert into product_screenshots (id, product_id, image_url, image_alt)
        values ('d', ${productId}, '/d.png', 'D')`;
      pendingReorder = reorder();
      await vi.waitFor(
        async () => {
          const [row] = await sql<{ blocked: boolean }[]>`
            select exists (
              select 1 from pg_stat_activity where ${owner.pid} = any(pg_blocking_pids(pid))
            ) as blocked
          `;
          expect(row.blocked).toBe(true);
        },
        { timeout: 2000, interval: 10 }
      );
    });
    expect((await pendingReorder)?.errors?.[0]?.extensions?.code).toBe('product-screenshot/order-changed');
    expect(await priorities()).toEqual([...before.slice(0, 3), { id: 'd', priority: 0 }, before[3]]);
  });
});
