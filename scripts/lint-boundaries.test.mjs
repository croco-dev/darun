import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const write = (fixture, relative, content) => {
  const target = path.join(fixture, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
};

test('실제 ESLint가 import 표기와 cwd에 무관하게 내부 계층 경계를 검사한다', () => {
  const fixture = realpathSync(mkdtempSync(path.join(tmpdir(), 'darun-lint-boundaries-')));
  try {
    // Copy the production config so its root is this isolated workspace. The only
    // rewritten import locates the unchanged shared base config and its plugins.
    const config = readFileSync(path.join(root, 'eslint.config.mjs'), 'utf8')
      .replaceAll('"./libs/shared/utils-eslint-config/', `"${root}/libs/shared/utils-eslint-config/`)
      .replaceAll("'./libs/shared/utils-eslint-config/", `'${root}/libs/shared/utils-eslint-config/`);
    write(fixture, 'eslint.config.mjs', config);
    write(fixture, 'package.json', JSON.stringify({ private: true, type: 'module' }));
    write(fixture, 'pnpm-workspace.yaml', 'packages:\n  - apps/*\n  - libs/*/*\n');
    for (const tool of [
      'eslint-plugin-boundaries',
      'eslint-plugin-react-compiler',
      'eslint-import-resolver-typescript',
    ]) {
      const target = path.join(fixture, 'node_modules', tool);
      mkdirSync(path.dirname(target), { recursive: true });
      symlinkSync(path.join(root, 'node_modules', tool), target, 'dir');
    }
    for (const [directory, name] of [
      ['apps/example', 'example'],
      ['libs/alpha/feature', '@darun/alpha-feature'],
      ['libs/alpha/service', '@darun/alpha-service'],
      ['libs/alpha/domain', '@darun/alpha-domain'],
      ['libs/alpha/datasource', '@darun/alpha-datasource'],
      ['libs/beta/domain', '@darun/beta-domain'],
      ['libs/products/domain', '@darun/products-domain'],
      ['libs/search/domain', '@darun/search-domain'],
    ]) {
      write(
        fixture,
        `${directory}/package.json`,
        JSON.stringify({
          name,
          type: 'module',
          main: './src/index.ts',
          exports: { '.': './src/index.ts', './public': './src/public.ts' },
        })
      );
      write(fixture, `${directory}/src/index.ts`, 'export const value = 1;\n');
      write(fixture, `${directory}/src/public.ts`, 'export const value = 2;\n');
      write(
        fixture,
        `${directory}/tsconfig.json`,
        JSON.stringify({
          compilerOptions: {
            moduleResolution: 'bundler',
            module: 'preserve',
            paths: { '@alpha-data': ['../datasource/src/index.ts'] },
          },
        })
      );
      if (name.startsWith('@darun/')) {
        const link = path.join(fixture, 'node_modules', name);
        mkdirSync(path.dirname(link), { recursive: true });
        symlinkSync(path.join(fixture, directory), link, 'dir');
      }
    }

    const cases = [];
    const add = (from, target, allowed, syntax = source => `import '${source}';\n`) => {
      const file = path.join(path.dirname(from), `${cases.length}-${path.basename(from)}`);
      write(fixture, file, syntax(target));
      cases.push({ file: path.join(fixture, file), allowed, target });
    };
    for (const [from, directory, workspace, allowed] of [
      ['libs/alpha/feature/src/browser.ts', '../../datasource/src', '@darun/alpha-datasource', false],
      ['libs/alpha/feature/src/browser.ts', '../../service/src', '@darun/alpha-service', false],
      ['libs/alpha/domain/src/entity.ts', '../../../beta/domain/src', '@darun/beta-domain', false],
      ['libs/alpha/service/src/service.ts', '../../datasource/src', '@darun/alpha-datasource', false],
      ['libs/alpha/service/src/service.ts', '../../domain/src', '@darun/alpha-domain', true],
      ['libs/alpha/feature/src/Example.resolver.ts', '../../service/src', '@darun/alpha-service', true],
      ['apps/example/src/app.ts', '../../../libs/alpha/feature/src', '@darun/alpha-feature', true],
      ['libs/search/domain/src/reader.ts', '../../../products/domain/src', '@darun/products-domain', true],
    ]) {
      for (const target of [workspace, `${directory}/index`, `${directory}/index.ts`]) {
        // Keep the resolver filename suffix, which is part of the real server classification.
        const source = from.replace('Example.resolver', `Example${cases.length}.resolver`);
        add(source, target, allowed);
      }
    }
    add('libs/alpha/feature/src/browser.ts', '@darun/alpha-datasource/public', false);
    add('libs/alpha/feature/src/browser.ts', '@alpha-data', false);
    for (const syntax of [
      source => `export { value } from '${source}';\n`,
      source => `export const value = import('${source}');\n`,
      source => `export const value = require('${source}');\n`,
      source => `import type { value } from '${source}';\nexport type Value = typeof value;\n`,
    ])
      add('libs/alpha/feature/src/browser.ts', '@darun/alpha-datasource', false, syntax);
    add('libs/alpha/domain/src/local.ts', './index', true);
    add('libs/alpha/feature/src/ExampleResolver.ts', '@darun/alpha-service', true);
    add('libs/alpha/feature/src/Example.resolver.tsx', '@darun/alpha-service', false);
    add('libs/alpha/feature/src/__tests__/browser.test.ts', '@darun/alpha-service', true);

    for (const cwd of [fixture, path.join(fixture, 'libs/alpha/feature')]) {
      const result = spawnSync(
        process.execPath,
        [path.join(root, 'node_modules/eslint/bin/eslint.js'), '--format', 'json', ...cases.map(item => item.file)],
        {
          cwd,
          encoding: 'utf8',
          timeout: 60_000,
        }
      );
      assert.ifError(result.error);
      assert.equal(result.status, 1, result.stderr || result.stdout);
      const results = JSON.parse(result.stdout);
      assert.equal(results.length, cases.length);
      for (const item of cases) {
        const lint = results.find(entry => entry.filePath === item.file);
        assert.ok(lint, item.file);
        assert.equal(lint.fatalErrorCount, 0, JSON.stringify(lint.messages));
        const errors = lint.messages.filter(
          message => message.ruleId?.startsWith('boundaries/') && message.severity === 2
        );
        assert.equal(errors.length, item.allowed ? 0 : 1, JSON.stringify({ cwd, ...item, messages: lint.messages }));
      }
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
