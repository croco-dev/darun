import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const appRoot = join(testDir, '..');

describe('service-web setup', () => {
  it('국제화와 앱 부트스트랩 파일이 존재한다', () => {
    expect(existsSync(join(appRoot, 'next.config.js'))).toBe(true);
    expect(existsSync(join(appRoot, 'middleware.ts'))).toBe(true);
    expect(existsSync(join(appRoot, 'i18n', 'routing.ts'))).toBe(true);
    expect(existsSync(join(appRoot, 'app', 'client.tsx'))).toBe(true);
    expect(existsSync(join(appRoot, 'app', 'server.tsx'))).toBe(true);
  });
});
