import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkWorkspaceImports } from './check-workspace-imports.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const write = (directory, relative, content) => {
  const target = path.join(directory, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
};
const json = (directory, relative, value) => write(directory, relative, JSON.stringify(value));

test('production imports have direct workspace dependencies and public package entries', () => {
  assert.deepEqual(checkWorkspaceImports(), []);
});

test('the import guard rejects missing declarations and private entries across import syntax', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'darun-import-owners-'));
  try {
    json(fixture, 'package.json', { name: 'fixture', private: true });
    write(fixture, 'pnpm-workspace.yaml', 'packages:\n  - apps/*\n  - libs/*\nverifyDepsBeforeRun: false\n');
    const dependencies = { '@darun/sample': 'workspace:*', '@darun/provider-auth/client': 'workspace:*' };
    for (const app of ['graphql-api', 'service-web'])
      json(fixture, `apps/${app}/package.json`, { name: app, dependencies });
    for (const [directory, name] of [
      ['sample', '@darun/sample'],
      ['auth', '@darun/provider-auth/client'],
    ]) {
      json(fixture, `libs/${directory}/package.json`, {
        name,
        main: './src/index.ts',
        types: './src/index.ts',
        exports: { '.': { types: './src/index.ts', default: './src/index.ts' }, './server': './src/server.ts' },
      });
      for (const entry of ['index', 'server', 'private'])
        write(fixture, `libs/${directory}/src/${entry}.ts`, 'export const value = 1;\n');
      const link = path.join(fixture, 'node_modules', name);
      mkdirSync(path.dirname(link), { recursive: true });
      symlinkSync(path.join(fixture, 'libs', directory), link, 'dir');
    }
    write(fixture, 'apps/graphql-api/src/main.ts', "export {value} from '@darun/sample/server';\n");
    write(fixture, 'apps/service-web/app/page.tsx', "import '@darun/provider-auth/client';\n");
    // Test-only imports and comment text do not impose production dependencies.
    write(fixture, 'apps/service-web/__tests__/example.ts', "import '@darun/test-only';\n");
    write(fixture, 'apps/service-web/app/ignored.d.ts', "import '@darun/types-only';\n");
    write(fixture, 'apps/service-web/app/comment.ts', "// import '@darun/comment';\nexport {};\n");
    assert.deepEqual(checkWorkspaceImports(fixture), []);

    for (const source of [
      "import '@darun/sample';",
      "export {value} from '@darun/sample/server';",
      "const value = import('@darun/sample/server');",
      "const value = require('@darun/sample');",
      "import type {value} from '@darun/sample';",
    ]) {
      write(fixture, 'apps/graphql-api/src/main.ts', source);
      json(fixture, 'apps/graphql-api/package.json', {
        name: 'graphql-api',
        devDependencies: dependencies,
        peerDependencies: dependencies,
      });
      const errors = checkWorkspaceImports(fixture);
      assert.equal(errors.length, 1, errors.join('\n'));
      assert.match(errors[0], /declare @darun\/sample in graphql-api dependencies/);
    }
    json(fixture, 'apps/graphql-api/package.json', { name: 'graphql-api', dependencies });
    write(fixture, 'apps/graphql-api/src/main.ts', "import '@darun/sample/private';\n");
    assert.match(checkWorkspaceImports(fixture).join('\n'), /cannot resolve a public entry/);
    write(fixture, 'apps/graphql-api/src/main.ts', "import '@darun/unknown';\n");
    assert.match(checkWorkspaceImports(fixture).join('\n'), /no workspace package owns this import/);
    // The longest workspace name owns this import, rather than an imagined provider-auth package.
    json(fixture, 'apps/service-web/package.json', {
      name: 'service-web',
      dependencies: { '@darun/provider-auth': 'workspace:*' },
    });
    assert.match(
      checkWorkspaceImports(fixture).join('\n'),
      /declare @darun\/provider-auth\/client in service-web dependencies/
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test('Turbo includes direct workspace tasks and propagates their source hashes to both apps', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'darun-workspace-graph-'));
  const run = (command, args, cwd = fixture) => {
    const result = spawnSync(command, args, {
      cwd,
      env: { ...process.env, TURBO_TELEMETRY_DISABLED: '1' },
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    return result.stdout;
  };
  const copy = relative => {
    const target = path.join(fixture, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(path.join(root, relative), target);
  };
  const task = app => {
    const graph = JSON.parse(
      run(path.join(root, 'node_modules/.bin/turbo'), ['run', 'typecheck', `--filter=${app}`, '--dry=json'])
    );
    return graph.tasks.find(value => value.taskId === `${app}#typecheck`);
  };
  try {
    const files = run('git', ['ls-files', '-z'], root).split('\0').filter(Boolean);
    for (const relative of files) {
      if (
        ['pnpm-workspace.yaml', 'pnpm-lock.yaml', '.gitignore'].includes(relative) ||
        /(^|\/)(package|turbo)\.json$/.test(relative)
      )
        copy(relative);
    }
    const cases = [
      ['graphql-api', '@darun/images-feature', 'libs/images/feature/src/index.ts'],
      ['graphql-api', '@darun/magazines-feature', 'libs/magazines/feature/src/index.ts'],
      ['service-web', '@darun/analytics-client', 'libs/shared/analytics/client/src/index.ts'],
      ['service-web', '@darun/sanitize', 'libs/shared/sanitize/src/index.ts'],
      ['service-web', '@darun/utils-router', 'libs/shared/utils-router/src/index.ts'],
    ];
    for (const [, , source] of cases) {
      assert.ok(existsSync(path.join(root, source)), source);
      copy(source);
    }
    for (const [app, dependency, source] of cases) {
      const baseline = task(app);
      assert.ok(baseline.dependencies.includes(`${dependency}#typecheck`), `${app} must select ${dependency}`);
      const original = readFileSync(path.join(fixture, source), 'utf8');
      write(fixture, source, `${original}\n// dependency input hash probe\n`);
      assert.notEqual(task(app).hash, baseline.hash, `${source} must invalidate ${app} typecheck`);
      write(fixture, source, original);
      assert.equal(task(app).hash, baseline.hash, 'restoring a dependency restores the input hash');
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
