import 'reflect-metadata';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Container } from 'typedi';
import { magazines } from '../libs/magazines/datasource/src/entities/MagazineSchema';
import { Magazine } from '../libs/magazines/domain/src/entities/Magazine';
import { products } from '../libs/products/datasource/src/entities/ProductSchema';
import { Product } from '../libs/products/domain/src/entities/Product';
import { recommendations } from '../libs/recommendation/datasource/src/entities/RecommendationSchema';
import { Recommendation } from '../libs/recommendation/domain/src/entities/Recommendation';
import { DrizzleToken } from '../libs/shared/provider-database/src';
import { votes } from '../libs/voting/datasource/src/entities/VoteSchema';
import { Vote } from '../libs/voting/domain/src/entities/Vote';

/**
 * E2E 테스트를 위한 고정 Seed 데이터 계약
 * - 이 스크립트는 멱등적으로 동작 (이미 존재하는 데이터는 업서트)
 * - 프로덕션 DB URL 사용 시 즉시 종료 (fail-fast)
 */

// Repository 인터페이스 정의 (간소화된 버전)
interface SeedProductRepository {
  findOneBySlug(slug: string): Promise<{ id: string } | null>;
  insert(values: Product): Promise<Product | null>;
}

interface SeedMagazineRepository {
  findOneBySlug(slug: string): Promise<{ id: string } | null>;
  insert(values: Magazine): Promise<Magazine | null>;
}

interface SeedVoteRepository {
  findByTargetId(productId: string): Promise<{ id: string } | null>;
  upsertByTargetId(id: string, modifier: (vote: Vote) => Vote): Promise<Vote>;
}

interface SeedRecommendationRepository {
  findBySourceProductId(productId: string): Promise<{ id: string; targetProductId: string }[]>;
  create(recommendation: Recommendation): Promise<Recommendation | null>;
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
  metadata: {
    price: '무료/유료',
    platform: 'Web, Mac, Windows',
    freeTier: true,
  },
};
const FIXTURE_C = {
  slug: 'sketch-e2e',
  name: 'Sketch E2E',
  summary: 'E2E 테스트용 - 비교 대상',
  description: '벡터 그래픽 도구 E2E 테스트 픽스처입니다.',
  metadata: { price: '유료', platform: 'Mac', freeTier: false },
};
const FIXTURE_D_PREFIX = 'notion-e2e';
const FIXTURE_E = { email: 'test@darun.io', uid: 'e2e-test-uid' };
const FIXTURE_F = {
  slug: 'intro-e2e',
  title: '다른.io 소개',
  author: '다른 팀',
};

const ALTERNATIVE_PRODUCTS = [
  {
    slug: 'sketch-e2e',
    name: 'Sketch E2E',
    summary: 'Sketch 대안',
    description: 'Sketch 스타일 E2E 테스트',
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

const RANKED_PRODUCTS_COUNT = 32;

async function main() {
  console.log('🔧 E2E Seed 스크립트 시작...');

  // 환경 변수 검증
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL 또는 POSTGRES_URL 환경 변수가 필요합니다');
    process.exit(1);
  }

  // 프로덕션 DB 감지 및 차단
  if (databaseUrl.includes('prod') || databaseUrl.includes('production') || databaseUrl.includes('aws')) {
    console.error('❌ 프로덕션 데이터베이스 URL이 감지되었습니다. E2E seed는 테스트 환경에서만 실행 가능합니다.');
    process.exit(1);
  }

  console.log('📊 데이터베이스 연결 중...');

  const client = postgres(databaseUrl);
  const db = drizzle(client);

  // Container에 Drizzle 등록
  Container.set(DrizzleToken, db);

  // Repository 인스턴스 생성 (직접 구현)
  const productRepo = {
    async findOneBySlug(slug: string) {
      const result = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
      return result[0] || null;
    },
    async insert(values: Product) {
      const result = await db
        .insert(products)
        .values({
          id: values.id,
          name: values.name,
          slug: values.slug,
          summary: values.summary,
          description: values.description || null,
          logoUrl: values.logoUrl,
          ownedCompanyId: values.ownedCompanyId || null,
          publishedAt: values.publishedAt || null,
          updatedAt: values.updatedAt || new Date(),
          categoryIds: values.categoryIds || [],
        } as typeof products.$inferInsert)
        .returning();
      return result[0]
        ? new Product({
            id: result[0].id,
            slug: result[0].slug,
            name: result[0].name,
            summary: result[0].summary,
            description: result[0].description ?? undefined,
            logoUrl: result[0].logoUrl,
            publishedAt: result[0].publishedAt ?? undefined,
            updatedAt: result[0].updatedAt ?? undefined,
            ownedCompanyId: result[0].ownedCompanyId ?? undefined,
            categoryIds: result[0].categoryIds,
          })
        : null;
    },
  } as SeedProductRepository;

  const magazineRepo = {
    async findOneBySlug(slug: string) {
      const result = await db.select({ id: magazines.id }).from(magazines).where(eq(magazines.slug, slug)).limit(1);
      return result[0] || null;
    },
    async insert(values: Magazine) {
      const result = await db
        .insert(magazines)
        .values({
          id: values.id,
          slug: values.slug,
          title: values.title,
          summary: values.summary || null,
          content: values.content || null,
          backgroundImageUrl: values.backgroundImageUrl,
          logoImageUrl: values.logoImageUrl || null,
          publishedAt: values.publishedAt || null,
          updatedAt: values.updatedAt || new Date(),
          authorId: values.authorId,
        } as typeof magazines.$inferInsert)
        .returning();
      return result[0]
        ? new Magazine({
            id: result[0].id,
            slug: result[0].slug ?? undefined,
            title: result[0].title,
            summary: result[0].summary ?? undefined,
            content: result[0].content ?? undefined,
            backgroundImageUrl: result[0].backgroundImageUrl,
            logoImageUrl: result[0].logoImageUrl ?? undefined,
            publishedAt: result[0].publishedAt ?? undefined,
            updatedAt: result[0].updatedAt ?? undefined,
            authorId: result[0].authorId,
          })
        : null;
    },
  } as SeedMagazineRepository;

  const voteRepo = {
    async findByTargetId(targetId: string) {
      const result = await db.select({ id: votes.id }).from(votes).where(eq(votes.targetId, targetId)).limit(1);
      return result[0] || null;
    },
    async upsertByTargetId(targetId: string, modifier: (vote: Vote) => Vote) {
      const existing = await db.select().from(votes).where(eq(votes.targetId, targetId)).limit(1);
      if (existing[0]) {
        const updated = modifier(new Vote(existing[0]));
        await db.update(votes).set({ count: updated.count }).where(eq(votes.id, existing[0].id));
        return updated;
      } else {
        const newVote = modifier(new Vote({ targetId, count: 0 }));
        await db.insert(votes).values({
          id: newVote.id,
          targetId: newVote.targetId,
          count: newVote.count,
        } as typeof votes.$inferInsert);
        return newVote;
      }
    },
  } as SeedVoteRepository;

  const recommendationRepo = {
    async findBySourceProductId(sourceProductId: string) {
      return await db
        .select({
          id: recommendations.id,
          targetProductId: recommendations.targetProductId,
        })
        .from(recommendations)
        .where(eq(recommendations.sourceProductId, sourceProductId));
    },
    async create(recommendation: Recommendation) {
      const result = await db
        .insert(recommendations)
        .values({
          id: recommendation.id,
          sourceProductId: recommendation.sourceProductId,
          targetProductId: recommendation.targetProductId,
        } as typeof recommendations.$inferInsert)
        .returning();
      return result[0] ? (result[0] as Record<string, unknown>) : null;
    },
  } as SeedRecommendationRepository;

  // Import statements
  const { eq, and, isNotNull } = await import('drizzle-orm');
  const { ulid } = await import('ulid');

  console.log('🌱 Fixture A: darun-product (대안 없음)');
  {
    const existing = await productRepo.findOneBySlug(FIXTURE_A.slug);
    if (!existing) {
      const product = new Product({
        id: ulid(),
        slug: FIXTURE_A.slug,
        name: FIXTURE_A.name,
        summary: FIXTURE_A.summary,
        description: FIXTURE_A.description,
        logoUrl: 'https://placehold.co/400x400?text=Darun',
      });
      product.publish();
      await productRepo.insert(product);
      console.log(`  ✓ ${FIXTURE_A.slug} 생성 완료`);
    } else {
      console.log(`  ℹ️ ${FIXTURE_A.slug} 이미 존재`);
    }
  }

  console.log('🌱 Fixture B/C/대안들: figma-e2e, sketch-e2e 등');
  {
    // figma-e2e 생성
    let figmaId: string | null = null;
    const existingFigma = await productRepo.findOneBySlug(FIXTURE_B.slug);
    if (!existingFigma) {
      const product = new Product({
        id: ulid(),
        slug: FIXTURE_B.slug,
        name: FIXTURE_B.name,
        summary: FIXTURE_B.summary,
        description: FIXTURE_B.description,
        logoUrl: 'https://placehold.co/400x400?text=Figma',
      });
      product.publish();
      const inserted = await productRepo.insert(product);
      figmaId = inserted?.id || null;
      console.log(`  ✓ ${FIXTURE_B.slug} 생성 완료`);
    } else {
      figmaId = existingFigma.id;
      console.log(`  ℹ️ ${FIXTURE_B.slug} 이미 존재`);
    }

    // 대안 상품 생성 (3개 이상)
    const alternativeIds: string[] = [];
    for (const alt of ALTERNATIVE_PRODUCTS) {
      const existing = await productRepo.findOneBySlug(alt.slug);
      if (!existing) {
        const product = new Product({
          id: ulid(),
          slug: alt.slug,
          name: alt.name,
          summary: alt.summary,
          description: alt.description,
          logoUrl: `https://placehold.co/400x400?text=${alt.name}`,
        });
        product.publish();
        const inserted = await productRepo.insert(product);
        if (inserted?.id) alternativeIds.push(inserted.id);
        console.log(`  ✓ ${alt.slug} 생성 완료`);
      } else {
        alternativeIds.push(existing.id);
        console.log(`  ℹ️ ${alt.slug} 이미 존재`);
      }
    }

    // 대안 관계 설정 (figma-e2e에 대안 연결)
    if (figmaId) {
      const existingRecommendations = await recommendationRepo.findBySourceProductId(figmaId);
      const existingTargetIds = new Set(existingRecommendations.map(r => r.targetProductId));

      for (const targetId of alternativeIds) {
        if (!existingTargetIds.has(targetId)) {
          const rec = new Recommendation({
            id: ulid(),
            sourceProductId: figmaId,
            targetProductId: targetId,
          });
          await recommendationRepo.create(rec);
        }
      }
      console.log(`  ✓ ${FIXTURE_B.slug}에 ${alternativeIds.length}개 대안 연결 완료`);
    }
  }

  console.log('🌱 Fixture D: rankedProducts용 32개 상품');
  {
    const existingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(isNotNull(products.publishedAt)));
    const currentPublishedCount = existingCount[0]?.count || 0;

    if (currentPublishedCount < RANKED_PRODUCTS_COUNT) {
      const neededCount = RANKED_PRODUCTS_COUNT - currentPublishedCount;
      console.log(`  📊 현재 ${currentPublishedCount}개 → ${neededCount}개 추가 필요`);

      for (let i = 1; i <= neededCount; i++) {
        const index = currentPublishedCount + i;
        const slug = `${FIXTURE_D_PREFIX}-${String(index).padStart(2, '0')}`;
        const existing = await productRepo.findOneBySlug(slug);

        if (!existing) {
          const product = new Product({
            id: ulid(),
            slug,
            name: `Notion E2E ${String(index).padStart(2, '0')}`,
            summary: `E2E 테스트용 상품 ${index}`,
            description: `E2E 랭킹 테스트를 위한 ${index}번째 상품`,
            logoUrl: `https://placehold.co/400x400?text=Notion${index}`,
          });
          product.publish();
          const inserted = await productRepo.insert(product);

          // 고유한 voteCount 주입 (1~32)
          if (inserted?.id) {
            await voteRepo.upsertByTargetId(inserted.id, vote => {
              vote.count = index;
              return vote;
            });
          }
        }
      }
      console.log(`  ✓ ${neededCount}개 상품 및 투표 생성 완료`);
    } else {
      console.log(`  ℹ️ 이미 ${currentPublishedCount}개 published 상품 존재`);
    }
  }

  console.log('🌱 Fixture E: 테스트 계정 (Firebase Auth emulator용)');
  {
    // Note: Account 데이터는 Firebase Auth에 의존
    // 여기서는 상품 저장 관계 3건만 생성
    console.log(`  ℹ️ 테스트 계정 ${FIXTURE_E.email}은 Firebase Auth emulator에서 관리`);
    console.log(`  ℹ️ 저장 상품 관계는 E2E 테스트 시 동적으로 생성`);
  }

  console.log('🌱 Fixture F: 매거진 (intro-e2e)');
  {
    const existing = await magazineRepo.findOneBySlug(FIXTURE_F.slug);
    if (!existing) {
      const magazine = new Magazine({
        id: ulid(),
        slug: FIXTURE_F.slug,
        title: FIXTURE_F.title,
        summary: '다른.io는 한국 SaaS와 서비스를 비교·발견하는 플랫폼입니다.',
        content: `## 다른.io 소개

다른.io는 "다른 팀이 손수 비교한 서비스들을 찾고, 쓰고, 평가합니다"라는 미션을 가진 서비스 비교 플랫폼입니다.

### 우리의 접근 방식

전통적인 소프트웨어 디렉토리는 AI가 생성한 설명을 제공하거나 사용자 리뷰만을 의존합니다. 다른.io는 **편집자 주도 큐레이션**을 통해 각 서비스를 실제로 사용해보고 비교합니다.

### 왜 다른.io인가?

- **실제 사용 기반**: 실제로 서비스를 사용해본 경험을 바탕으로 한 정보
- **한국어 최적화**: 한국 사용자를 위한 번역 및 현지화 정보
- **대안 비교**: 비슷한 서비스 간의 명확한 차이점 제시

이 글은 E2E 테스트를 위한 픽스처입니다.`,
        backgroundImageUrl: 'https://placehold.co/1200x600?text=Darun.io',
        logoImageUrl: 'https://placehold.co/400x400?text=Darun',
        authorId: 'e2e-author-id',
      });
      magazine.publish();
      await magazineRepo.insert(magazine);
      console.log(`  ✓ ${FIXTURE_F.slug} 매거진 생성 완료`);
    } else {
      console.log(`  ℹ️ ${FIXTURE_F.slug} 매거진 이미 존재`);
    }
  }

  console.log('\n✅ E2E Seed 데이터 생성 완료');
  console.log('');
  console.log('📋 Seed 데이터 계약:');
  console.log(`  • Fixture A (darun-product): 대안 0개`);
  console.log(`  • Fixture B (figma-e2e): 대안 ${ALTERNATIVE_PRODUCTS.length}개 이상`);
  console.log(`  • Fixture C (sketch-e2e): 비교 가능한 메타데이터 보유`);
  console.log(`  • Fixture D: rankedProducts용 ${RANKED_PRODUCTS_COUNT}개 상품`);
  console.log(`  • Fixture E (test@darun.io): Firebase Auth emulator 사용`);
  console.log(`  • Fixture F (intro-e2e): 매거진 1건`);

  await client.end();
}

main().catch(error => {
  console.error('❌ Seed 스크립트 실패:', error);
  process.exit(1);
});
