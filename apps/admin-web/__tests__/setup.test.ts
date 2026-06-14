import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const appRoot = join(testDir, '..');

describe('admin-web setup', () => {
  it('초기 진입 경로가 products로 리디렉션되도록 설정되어 있다', () => {
    const configPath = join(appRoot, 'next.config.mjs');
    const configText = readFileSync(configPath, 'utf-8');

    expect(configText).toMatch(/source:\s*['"]\/['"]/);
    expect(configText).toMatch(/destination:\s*['"]\/products['"]/);
  });

  it('로컬 개발 포트가 3001로 고정되어 있다', () => {
    const packageJson = JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf-8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.dev).toMatch(/--port\s+3001/);
  });

  it('transpile 대상에 darun 공유 UI 패키지가 포함되어 있다', () => {
    const configPath = join(appRoot, 'next.config.mjs');
    const configText = readFileSync(configPath, 'utf-8');

    expect(configText).toMatch(/transpilePackages:\s*\[[\s\S]*?['"]@darun\/ui['"]/);
    expect(configText).toMatch(/['"]@darun\/ui-layout['"]/);
  });
});
