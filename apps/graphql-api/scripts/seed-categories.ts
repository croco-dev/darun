import 'reflect-metadata';
import { eq, isNotNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { categories } from '../../../libs/products/datasource/src/entities/CategorySchema';
import { products } from '../../../libs/products/datasource/src/entities/ProductSchema';
import { productTags } from '../../../libs/products/datasource/src/entities/ProductTagsSchema';
import { tags } from '../../../libs/products/datasource/src/entities/TagSchema';

/**
 * categories 테이블 시드 + products.categoryIds 역채우기
 *
 * tag(name) → category(slug) 매핑을 기준으로:
 * 1. categories 테이블에 없는 카테고리를 삽입한다 (멱등).
 * 2. 각 product의 tag를 조회하여 대응하는 category id로 categoryIds를 갱신한다.
 *
 * 프로덕션 DB URL에서도 안전하게 실행할 수 있도록 fail-fast 가드를 두지 않는다.
 */

const TAG_TO_CATEGORY: { tagNames: string[]; slug: string; labelKo: string; labelEn: string }[] = [
  { tagNames: ['개발자 도구'], slug: 'developer-tools', labelKo: '개발자 도구', labelEn: 'Developer Tools' },
  { tagNames: ['건강 및 피트니스'], slug: 'health-fitness', labelKo: '건강 및 피트니스', labelEn: 'Health & Fitness' },
  { tagNames: ['게임'], slug: 'games', labelKo: '게임', labelEn: 'Games' },
  { tagNames: ['교육'], slug: 'education', labelKo: '교육', labelEn: 'Education' },
  { tagNames: ['금융'], slug: 'finance', labelKo: '금융', labelEn: 'Finance' },
  { tagNames: ['내비게이션'], slug: 'navigation', labelKo: '내비게이션', labelEn: 'Navigation' },
  { tagNames: ['뉴스'], slug: 'news', labelKo: '뉴스', labelEn: 'News' },
  { tagNames: ['라이프스타일'], slug: 'lifestyle', labelKo: '라이프스타일', labelEn: 'Lifestyle' },
  { tagNames: ['비즈니스'], slug: 'business', labelKo: '비즈니스', labelEn: 'Business' },
  { tagNames: ['사진 및 비디오'], slug: 'photo-video', labelKo: '사진 및 비디오', labelEn: 'Photo & Video' },
  { tagNames: ['생산성'], slug: 'productivity', labelKo: '생산성', labelEn: 'Productivity' },
  { tagNames: ['소셜 네트워킹'], slug: 'social-networking', labelKo: '소셜 네트워킹', labelEn: 'Social Networking' },
  { tagNames: ['쇼핑'], slug: 'shopping', labelKo: '쇼핑', labelEn: 'Shopping' },
  { tagNames: ['엔터테인먼트'], slug: 'entertainment', labelKo: '엔터테인먼트', labelEn: 'Entertainment' },
  { tagNames: ['유틸리티'], slug: 'utilities', labelKo: '유틸리티', labelEn: 'Utilities' },
  { tagNames: ['음식 및 음료'], slug: 'food-drink', labelKo: '음식 및 음료', labelEn: 'Food & Drink' },
  { tagNames: ['참고'], slug: 'reference', labelKo: '참고', labelEn: 'Reference' },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL 또는 POSTGRES_URL 환경 변수가 필요합니다');
    process.exit(1);
  }

  console.log('📊 데이터베이스 연결 중...');
  const client = postgres(databaseUrl);
  const db = drizzle(client);

  // --- 1. categories 테이블 시드 ---
  console.log('🌱 categories 테이블 시드 시작...');
  const existingCategories = await db.select().from(categories);
  const existingSlugs = new Set(existingCategories.map(c => c.slug));

  const toInsert = TAG_TO_CATEGORY.filter(c => !existingSlugs.has(c.slug));
  if (toInsert.length > 0) {
    await db
      .insert(categories)
      .values(
        toInsert.map(c => ({
          slug: c.slug,
          labelKo: c.labelKo,
          labelEn: c.labelEn,
        }))
      )
      .returning();
    console.log(`  ✓ ${toInsert.length}개 카테고리 삽입`);
  } else {
    console.log('  ℹ️ 모든 카테고리가 이미 존재');
  }

  // category slug → id 매핑
  const allCategories = await db.select().from(categories);
  const slugToId = new Map(allCategories.map(c => [c.slug, c.id]));

  // --- 2. tag name → category id 매핑 ---
  const allTags = await db.select().from(tags);
  const tagNameToCategoryIds = new Map<string, string[]>();

  for (const mapping of TAG_TO_CATEGORY) {
    const categoryId = slugToId.get(mapping.slug);
    if (!categoryId) continue;
    for (const tagName of mapping.tagNames) {
      const existing = tagNameToCategoryIds.get(tagName) ?? [];
      existing.push(categoryId);
      tagNameToCategoryIds.set(tagName, existing);
    }
  }

  // tag name → tag id 매핑
  const tagNameToTagId = new Map(allTags.map(t => [t.name, t.id]));

  // --- 3. 각 product의 categoryIds 갱신 ---
  console.log('🌱 products.categoryIds 갱신 시작...');

  const publishedProducts = await db.select({ id: products.id }).from(products).where(isNotNull(products.publishedAt));

  let updatedCount = 0;

  for (const product of publishedProducts) {
    // product의 tag 조회
    const productTagRows = await db
      .select({ tagId: productTags.tagId })
      .from(productTags)
      .where(eq(productTags.productId, product.id));

    if (productTagRows.length === 0) continue;

    // tag id → tag name → category id 수집
    const categoryIds = new Set<string>();
    for (const row of productTagRows) {
      const tag = allTags.find(t => t.id === row.tagId);
      if (!tag) continue;
      const catIds = tagNameToCategoryIds.get(tag.name);
      if (catIds) {
        catIds.forEach(id => categoryIds.add(id));
      }
    }

    if (categoryIds.size === 0) continue;

    await db
      .update(products)
      .set({ categoryIds: [...categoryIds] })
      .where(eq(products.id, product.id));

    updatedCount++;
  }

  console.log(`  ✓ ${updatedCount}개 product의 categoryIds 갱신 완료`);
  console.log('\n✅ 카테고리 시드 완료');

  await client.end();
}

main().catch(error => {
  console.error('❌ 카테고리 시드 실패:', error);
  process.exit(1);
});
