import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../..');
const markup = '<h2>Safe title</h2><table><tbody><tr><td>Plan</td></tr></tbody></table>';
const probe = `
  const DOMPurify = require(process.argv[1]);
  const fragment = DOMPurify.sanitize(process.argv[2], { RETURN_DOM_FRAGMENT: true });
  const container = fragment.ownerDocument.createElement('div');
  container.append(fragment);
  process.stdout.write(container.innerHTML);
`;

describe('Vercel server HTML sanitization', () => {
  it.each([
    ['service-web', 'libs/products/shell'],
    ['visual-web', 'apps/visual-web'],
  ])('%s loads its sanitizer when the platform disables require(ESM) by default', (app, consumer) => {
    const configPath = resolve(root, 'apps', app, 'vercel.json');
    const config = (existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {}) as {
      env?: Record<string, string>;
    };
    const require = createRequire(resolve(root, consumer, 'package.json'));
    const result = spawnSync(
      process.execPath,
      [
        '-e',
        probe,
        require.resolve('isomorphic-dompurify'),
        markup + '<script>alert(1)</script><img onerror="alert(2)">',
      ],
      {
        encoding: 'utf8',
        timeout: 10000,
        env: {
          ...process.env,
          ...config.env,
          // Reproduce the platform default before applying the deployment's Node options.
          NODE_OPTIONS: `--no-experimental-require-module ${config.env?.NODE_OPTIONS ?? ''}`,
        },
      }
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(markup);
    expect(result.stdout).not.toMatch(/script|onerror|alert/);
  });
});
