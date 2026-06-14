import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const appRoot = join(testDir, '..');

describe('visual-web setup', () => {
  it('Sentry 모니터링 터널 라우트가 /monitoring로 구성되어 있다', () => {
    const configPath = join(appRoot, 'next.config.js');
    const configText = readFileSync(configPath, 'utf-8');

    expect(configText).toMatch(/tunnelRoute:\s*['"]\/monitoring['"]/);
  });

  it('Sentry org과 project 이름이 안정적이다', () => {
    const configPath = join(appRoot, 'next.config.js');
    const configText = readFileSync(configPath, 'utf-8');

    expect(configText).toMatch(/org:\s*['"]croco['"]/);
    expect(configText).toMatch(/project:\s*['"]darun-web['"]/);
  });

  it('poweredByHeader가 비활성화되어 있다', () => {
    const configPath = join(appRoot, 'next.config.js');
    const configText = readFileSync(configPath, 'utf-8');

    expect(configText).toMatch(/poweredByHeader:\s*false/);
  });
});
