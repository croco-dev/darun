import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const appRoot = join(testDir, '..');

describe('admin-web setup', () => {
  it('핵심 앱 파일이 존재한다', () => {
    expect(existsSync(join(appRoot, 'next.config.mjs'))).toBe(true);
    expect(existsSync(join(appRoot, 'middleware.ts'))).toBe(true);
    expect(existsSync(join(appRoot, 'app', 'layout.tsx'))).toBe(true);
  });
});
