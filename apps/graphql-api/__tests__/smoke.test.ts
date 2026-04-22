import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const appRoot = join(testDir, '..');

describe('graphql-api smoke', () => {
  it('API 실행 스크립트와 GraphQL 엔트리 파일이 준비되어 있다', () => {
    const packageJson = JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf-8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      dev: 'serverless offline --stage dev',
      test: 'vitest run',
      typecheck: 'tsc --noEmit',
    });
    expect(existsSync(join(appRoot, 'src', 'functions', 'graphql.ts'))).toBe(true);
  });
});
