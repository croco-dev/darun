import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { join } from 'path';

const LOCAL_HOST_MARKERS = ['localhost', '127.0.0.1', '::1', 'postgres'];
const PROD_HOST_MARKERS = ['prod', 'production', 'aws', 'amazonaws'];
const ALLOWED_DATABASES = ['darun'];

function isLocalUrl(url: string): boolean {
  const lower = url.toLowerCase();

  if (PROD_HOST_MARKERS.some(marker => lower.includes(marker))) {
    return false;
  }

  return LOCAL_HOST_MARKERS.some(marker => lower.includes(marker));
}

function extractDatabaseName(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\//, '') || null;
  } catch {
    return null;
  }
}

function maskDatabaseUrl(url: string): string {
  return url.replace(/:[^:@]+@/, ':****@');
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL 환경 변수가 필요합니다');
    process.exit(1);
  }

  if (!isLocalUrl(databaseUrl)) {
    console.error(
      '로컬 데이터베이스 URL이 아닙니다. bootstrap은 localhost/127.0.0.1/postgres 호스트만 허용하며, prod/production/aws 마커를 거부합니다.'
    );
    process.exit(1);
  }

  const databaseName = extractDatabaseName(databaseUrl);
  if (!databaseName || !ALLOWED_DATABASES.includes(databaseName)) {
    console.error(`데이터베이스 이름이 darun이어야 합니다. 현재: ${databaseName ?? '알 수 없음'}`);
    process.exit(1);
  }

  console.log(`PostgreSQL 부트스트랩 시작: ${maskDatabaseUrl(databaseUrl)}`);

  const client = postgres(databaseUrl, { prepare: false, max: 1 });
  const db = drizzle(client);

  try {
    const publicTables = await client`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `;

    if (publicTables.length > 0) {
      console.log(`기존 테이블 ${publicTables.length}개 제거 중...`);
      for (const row of publicTables) {
        const tableName = row.table_name as string;
        await client.unsafe(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
      }
    }

    await client`DROP SCHEMA IF EXISTS drizzle CASCADE`;

    console.log('Drizzle 스키마 동기화 중...');
    await migrate(db, { migrationsFolder: join(__dirname, 'migrations') });

    const afterTables = await client`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `;

    console.log(`부트스트랩 완료. public 스키마 테이블 ${afterTables.length}개 생성됨:`);
    for (const row of afterTables) {
      console.log(`  - ${row.table_name}`);
    }
  } catch (error) {
    console.error('부트스트랩 실패:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
