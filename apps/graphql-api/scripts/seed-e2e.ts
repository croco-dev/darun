// Fixture writes are allowed only in the dedicated local E2E database.
function localDatabaseUrl(value: string | undefined, kind: 'postgres' | 'mongo'): string {
  const message = `${kind}: 전용 로컬 darun_e2e 데이터베이스 URL이 필요합니다`;
  if (!value) throw new Error(message);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(message);
  }
  const protocols = kind === 'postgres' ? ['postgres:', 'postgresql:'] : ['mongodb:'];
  const hosts = ['localhost', '127.0.0.1', '[::1]', kind];
  if (
    !protocols.includes(url.protocol) ||
    !hosts.includes(url.hostname) ||
    url.pathname !== (kind === 'postgres' ? '/darun_e2e' : '/darun')
  ) {
    throw new Error(message);
  }
  // Query options can redirect MongoDB to a different database or proxy.
  if ([...url.searchParams.keys()].some(key => kind !== 'mongo' || !['authSource', 'directConnection'].includes(key))) {
    throw new Error(message);
  }
  if (url.searchParams.has('directConnection') && url.searchParams.get('directConnection') !== 'true') {
    throw new Error(message);
  }
  return value;
}

// Seed 데이터 상수
const FIXTURE_A = {
  slug: 'darun-product',
  name: '다른 서비스',
  summary: 'E2E 테스트용 - 대안 없음',
  description: '대안이 없는 테스트 상품입니다.',
};
const FIXTURE_B = {
  slug: 'figma-e2e',
  name: 'Figma E2E',
  summary: 'E2E 테스트용 - 다수 대안 보유',
  description: '디자인 도구 E2E 테스트 픽스처입니다.',
};
const FIXTURE_C = {
  slug: 'sketch-e2e',
  name: 'Sketch E2E',
  summary: 'E2E 테스트용 - 비교 대상',
  description: '벡터 그래픽 도구 E2E 테스트 픽스처입니다.',
};
const FIXTURE_F = {
  slug: 'intro-e2e',
  title: '다른.io 소개',
};

const ALTERNATIVE_PRODUCTS = [
  {
    ...FIXTURE_C,
  },
  {
    slug: 'adobe-xd-e2e',
    name: 'Adobe XD E2E',
    summary: 'Adobe XD 대안',
    description: 'Adobe XD 스타일 E2E 테스트',
  },
  {
    slug: 'invision-e2e',
    name: 'InVision E2E',
    summary: 'InVision 대안',
    description: 'InVision 스타일 E2E 테스트',
  },
];

const rankedProducts = Array.from({ length: 32 }, (_, offset) => {
  const index = offset + 1;
  return {
    slug: `notion-e2e-${String(index).padStart(2, '0')}`,
    name: `Notion E2E ${String(index).padStart(2, '0')}`,
    summary: `E2E 테스트용 상품 ${index}`,
    description: `E2E 랭킹 테스트를 위한 ${index}번째 상품`,
    voteCount: index,
  };
});

async function main() {
  const databaseUrl = localDatabaseUrl(process.env.DATABASE_URL, 'postgres');
  const mongodbUrl = localDatabaseUrl(process.env.MONGODB_URI, 'mongo');
  // Reject invalid destinations without paying the database modules' startup cost.
  const [
    { and, eq, inArray, notInArray },
    { drizzle },
    { mongo },
    { default: postgres },
    { magazines },
    { products },
    { alternativeProducts },
    { votes },
  ] = await Promise.all([
    import('drizzle-orm'),
    import('drizzle-orm/postgres-js'),
    import('mongoose'),
    import('postgres'),
    import('../../../libs/magazines/datasource/src/entities/MagazineSchema'),
    import('../../../libs/products/datasource/src/entities/ProductSchema'),
    import('../../../libs/recommendation/datasource/src/entities/AlternativeProductSchema'),
    import('../../../libs/voting/datasource/src/entities/VoteSchema'),
  ]);
  const client = postgres(databaseUrl, { max: 1 });
  const search = new mongo.MongoClient(mongodbUrl, {
    serverSelectionTimeoutMS: 3000,
  });
  try {
    await search.connect();
    const seeded = await drizzle(client).transaction(async db => {
      const result: Array<typeof products.$inferSelect & { voteCount: number }> = [];
      const fixtures: Array<{
        slug: string;
        name: string;
        summary: string;
        description: string;
        voteCount?: number;
      }> = [FIXTURE_A, FIXTURE_B, ...ALTERNATIVE_PRODUCTS, ...rankedProducts];
      for (const fixture of fixtures) {
        const values = {
          slug: fixture.slug,
          name: fixture.name,
          summary: fixture.summary,
          description: fixture.description,
          logoUrl: '/images/default-product-icon.svg',
          publishedAt: new Date('2025-01-01T00:00:00Z'),
        };
        const [product] = await db
          .insert(products)
          .values(values)
          .onConflictDoUpdate({
            target: products.slug,
            set: values,
          })
          .returning();
        if (!product) throw new Error('E2E 상품 저장 실패');
        const count = fixture.voteCount ?? 0;
        await db.insert(votes).values({ targetId: product.id, count }).onConflictDoUpdate({
          target: votes.targetId,
          set: { count },
        });
        result.push({ ...product, voteCount: count });
      }
      // Restore fixture-owned outgoing relationships without changing unrelated sources.
      const figma = result.find(p => p.slug === 'figma-e2e')!;
      const alternativeIds = ALTERNATIVE_PRODUCTS.map(alt => result.find(p => p.slug === alt.slug)!.id);
      await db.delete(alternativeProducts).where(
        inArray(
          alternativeProducts.productId,
          result.filter(p => p.id !== figma.id).map(p => p.id)
        )
      );
      await db
        .delete(alternativeProducts)
        .where(
          and(
            eq(alternativeProducts.productId, figma.id),
            notInArray(alternativeProducts.alternativeProductId, alternativeIds)
          )
        );
      for (const alternativeProductId of alternativeIds) {
        await db
          .insert(alternativeProducts)
          .values({ productId: figma.id, alternativeProductId })
          .onConflictDoNothing();
      }
      const magazine = {
        slug: FIXTURE_F.slug,
        title: FIXTURE_F.title,
        summary: '다른.io는 한국 SaaS와 서비스를 비교·발견하는 플랫폼입니다.',
        content: '<h2>다른.io 소개</h2><p>한국 SaaS와 서비스를 비교하고 발견하는 E2E 테스트 픽스처입니다.</p>',
        backgroundImageUrl: '/images/main-hero-banner.png',
        logoImageUrl: '/images/default-product-icon.svg',
        authorId: 'e2e-author-id',
        publishedAt: new Date('2025-01-01T00:00:00Z'),
      };
      await db.insert(magazines).values(magazine).onConflictDoUpdate({ target: magazines.slug, set: magazine });
      return result;
    });
    // Local fixtures bypass workers. If MongoDB fails after SQL commits, rerun to repair it.
    const collection = search.db('darun').collection('searchableProducts');
    for (const product of seeded) {
      await collection.updateOne(
        { productId: product.id },
        {
          $set: {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            summary: product.summary,
            description: product.description ?? '',
            tags: [],
            category: '',
            votes: product.voteCount,
            createdAt: product.createdAt,
            publishedAt: product.publishedAt,
            sourceRevision: mongo.Long.fromBigInt(product.contentRevision),
          },
        },
        { upsert: true }
      );
    }
    console.log('E2E fixture 완료: 상품 37개(랭킹 32개), 대안 3개, 매거진 1개, 검색 문서 37개');
    console.log('Firebase emulator 테스트 계정과 저장 관계는 tests/helpers/auth-mock.ts에서 준비합니다.');
  } finally {
    await Promise.all([client.end(), search.close()]);
  }
}

main().catch(() => {
  // Driver errors may contain credentials or connection strings.
  console.error('E2E seed 실패: 전용 로컬 DB URL, migration 및 MongoDB 연결을 확인하세요.');
  process.exitCode = 1;
});
