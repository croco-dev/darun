/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS launcher, like dev.cjs. */
const { build } = require('esbuild');
const { rm } = require('node:fs/promises');
const path = require('node:path');

async function run() {
  if (process.env.INFRA_ENV !== 'local') throw new Error('INFRA_ENV=local이 필요합니다.');
  const outfile = path.resolve(`.build/local-search-sync-${process.pid}.cjs`);
  try {
    await build({
      entryPoints: ['src/local-search-sync.ts'],
      bundle: true,
      platform: 'node',
      target: 'node22',
      format: 'cjs',
      outfile,
      external: ['class-validator'],
      plugins: require('../esbuild.plugins.js'),
    });
    await require(outfile).main();
  } finally {
    await rm(outfile, { force: true });
  }
}

void run().catch(() => {
  console.error('로컬 검색 동기화 실패: 로컬 연결 설정과 DB 상태, --limit(1~100)을 확인하세요.');
  process.exitCode = 1;
});
