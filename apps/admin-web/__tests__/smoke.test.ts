import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const appRoot = join(testDir, '..');

describe('admin-web smoke', () => {
  it('필수 실행 스크립트가 정의되어 있다', () => {
    const packageJsonPath = join(appRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      build: 'next build',
      dev: 'next dev --turbopack --port 3001',
      test: 'vitest run',
      typecheck: 'tsc --noEmit',
    });
  });
});
