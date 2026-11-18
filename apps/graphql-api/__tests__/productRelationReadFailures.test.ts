import 'reflect-metadata';
import {
  PostgresqlProductFeatureRepository,
  PostgresqlProductLinkRepository,
  PostgresqlProductScreenshotRepository,
} from '@darun/products-datasource';
import {
  GetProduct,
  GetProductFeatures,
  GetProductLinks,
  GetProductScreenshots,
  GetPublishedProduct,
  Product,
  type ProductRepository,
} from '@darun/products-domain';
import { ProductQueryResolver } from '@darun/products-feature/server';
import { AuthRole, createAuthChecker, createServer } from '@darun/utils-apollo-server';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('product relation reads through GraphQL', () => {
  const product = new Product({ id: 'p1', slug: 'fixture', name: 'Fixture', summary: '', logoUrl: '' });
  const findOneBySlug = vi.fn().mockResolvedValue(product);
  const productRepository = {
    findOneBySlug,
    findPublishedOneBySlug: vi.fn().mockResolvedValue(product),
  } as unknown as ProductRepository;

  let failingTable: string | undefined;
  const privateError = 'private SQL and parameter';
  const execute = vi.fn(async (sql: string) => {
    if (failingTable && sql.includes(`from "${failingTable}"`)) throw new Error(privateError);
    return { rows: [] };
  });
  const db = drizzle(execute) as unknown as ConstructorParameters<typeof PostgresqlProductLinkRepository>[0];
  const unused = undefined!;
  const resolver = new ProductQueryResolver(
    unused,
    unused,
    unused,
    new GetProduct(productRepository),
    new GetPublishedProduct(productRepository),
    new GetProductLinks(new PostgresqlProductLinkRepository(db)),
    unused,
    new GetProductScreenshots(new PostgresqlProductScreenshotRepository(db)),
    unused,
    new GetProductFeatures(new PostgresqlProductFeatureRepository(db)),
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    productRepository
  );
  const server = createServer({
    options: {
      resolvers: [ProductQueryResolver],
      container: { get: () => resolver },
      authChecker: createAuthChecker(),
    },
    config: { playground: false },
  });

  beforeAll(() => server.start());
  afterAll(() => server.stop());
  beforeEach(() => {
    failingTable = undefined;
    vi.clearAllMocks();
  });

  async function request(query: string, roles: AuthRole[]) {
    const result = await server.executeOperation({ query }, { contextValue: { getRoles: async () => roles } });
    if (result.body.kind !== 'single') throw new Error('Expected single response');
    return result.body.singleResult;
  }

  it.each([
    ['links', 'product_links'],
    ['screenshots', 'product_screenshots'],
    ['features', 'product_features'],
  ])('surfaces failed admin %s reads and preserves successful empty and public reads', async (field, table) => {
    const adminSelection = `relation: tempProductBySlug(slug: "fixture") { ${field} { id } }`;
    const publicSelection = `published: productBySlug(slug: "fixture") { name ${field} { id } }`;
    const query = `{ ${adminSelection} ${publicSelection} }`;
    failingTable = table;

    // Both roots use the same product, admin context and failing relationship.
    const failed = await request(query, [AuthRole.Admin]);
    expect(failed.data).toEqual({ relation: null, published: { name: 'Fixture', [field]: [] } });
    expect(failed.errors).toHaveLength(1);
    expect(failed.errors?.[0]).toMatchObject({
      message: 'Internal server error',
      path: ['relation', field],
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
    expect(JSON.stringify(failed)).not.toContain(privateError);

    failingTable = undefined;
    const retried = await request(`{ ${adminSelection} }`, [AuthRole.Admin]);
    expect(retried.errors).toBeUndefined();
    expect(retried.data).toEqual({ relation: { [field]: [] } });
  });

  it('rejects an unauthorized admin read before product or relationship lookup', async () => {
    const result = await request('{ tempProductBySlug(slug: "fixture") { links { id } } }', []);
    expect(result.data).toEqual({ tempProductBySlug: null });
    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0].path).toEqual(['tempProductBySlug']);
    expect(findOneBySlug).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
});
