import postgres from 'postgres';
import { spawnSync } from 'child_process';
import { join } from 'path';

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]', 'postgres'];

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes('--reset');
  if (args.length !== 0 && !(args.length === 2 && reset && args.includes('--confirm-delete-local-data'))) {
    throw new Error('Usage: local:bootstrap | local:reset --confirm-delete-local-data (기존 데이터 전체 삭제)');
  }

  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) throw new Error('DATABASE_URL 환경 변수가 필요합니다');

  let target: URL;
  try {
    target = new URL(databaseUrl);
  } catch {
    throw new Error('유효한 PostgreSQL DATABASE_URL이 필요합니다');
  }
  if (
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !LOCAL_HOSTS.includes(target.hostname) ||
    target.pathname !== '/darun' ||
    target.search ||
    target.hash
  ) {
    throw new Error('로컬 localhost/127.0.0.1/[::1]/postgres 호스트의 darun DB만 허용합니다 (query/fragment 불가)');
  }

  // Never print credentials or arbitrary URL components.
  console.log(`PostgreSQL 로컬 준비 대상: ${target.hostname}:${target.port || '5432'}/darun`);
  if (reset) {
    console.log('명시적 reset: public 스키마의 모든 객체·데이터와 drizzle migration 이력을 삭제합니다.');
    const client = postgres(databaseUrl, { prepare: false, max: 1 });
    try {
      await client.begin(async transaction => {
        await transaction`DROP SCHEMA IF EXISTS public CASCADE`;
        await transaction`DROP SCHEMA IF EXISTS drizzle CASCADE`;
        await transaction`CREATE SCHEMA public`;
      });
    } finally {
      await client.end();
    }
  }

  // Use the same history verification and pending-only migration path as migrate.
  const result = spawnSync(process.execPath, [...process.execArgv, join(__dirname, 'migrate.ts')], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });
  if (result.error || result.status !== 0) {
    throw new Error('로컬 migration 실패: 기존 DB와 migration 이력을 확인하세요. 자동 삭제로 복구하지 않습니다.');
  }
  console.log('로컬 준비 완료');
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error && !(error instanceof postgres.PostgresError)
      ? error.message
      : 'DB 작업 실패: 접속 설정과 DB 진단을 안전하게 확인하세요.';
  console.error('로컬 준비 실패:', message);
  process.exitCode = 1;
});
