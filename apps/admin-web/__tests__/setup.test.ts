import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const appRoot = join(testDir, '..');

describe('admin-web setup', () => {
  it('대시보드(/) 루트 경로 페이지가 존재하며 독립 라우트로 제공된다', () => {
    const dashboardPagePath = join(appRoot, 'app', 'page.tsx');
    expect(existsSync(dashboardPagePath)).toBe(true);

    const configPath = join(appRoot, 'next.config.mjs');
    const configText = readFileSync(configPath, 'utf-8');
    expect(configText).not.toMatch(/destination:\s*['"]\/products['"]/);
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
