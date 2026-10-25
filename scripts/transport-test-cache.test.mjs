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

const root = fileURLToPath(new URL('../', import.meta.url));

test('sibling transports invalidate the cached admin cancellation regression', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'darun-transport-cache-'));
  const env = {
    ...process.env,
    PATH: `${path.join(root, 'node_modules/.bin')}${path.delimiter}${process.env.PATH}`,
    TURBO_TELEMETRY_DISABLED: '1',
  };
  const run = (command, args, cwd = fixture) => {
    const result = spawnSync(command, args, {
      cwd,
      env,
      encoding: 'utf8',
      timeout: 60_000,
    });
    assert.ifError(result.error);
    return {
      status: result.status,
      stdout: result.stdout,
      output: `${result.stdout}${result.stderr}`,
    };
  };
  const copy = relative => {
    const target = path.join(fixture, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(path.join(root, relative), target);
  };
  const args = ['run', 'test', '--filter=admin-web', '--only', '--cache=local:rw'];
  const testArgs = ['--', '__tests__/transportCancellation.test.ts'];
  const task = (includeDependencies = false) => {
    const selected = includeDependencies ? args.filter(arg => arg !== '--only') : args;
    const result = run('turbo', [...selected, '--dry=json', ...testArgs]);
    assert.equal(result.status, 0, result.output);
    return JSON.parse(result.stdout).tasks.find(t => t.taskId === 'admin-web#test');
  };
  const execute = () => run('turbo', [...args, ...testArgs]);

  try {
    const tracked = run('git', ['ls-files', '-z'], root);
    assert.equal(tracked.status, 0, tracked.output);
    // Preserve the real workspace graph and installed resolutions without installing dependencies.
    for (const relative of tracked.output.split('\0').filter(Boolean)) {
      if (
        relative === '.gitignore' ||
        relative === 'pnpm-workspace.yaml' ||
        relative === 'pnpm-lock.yaml' ||
        /(^|\/)(package|turbo)\.json$/.test(relative) ||
        relative.startsWith('libs/shared/utils-apollo-client/client/src/')
      )
        copy(relative);
      if (relative.endsWith('/package.json')) {
        const modules = path.join(root, path.dirname(relative), 'node_modules');
        if (existsSync(modules)) {
          const target = path.join(fixture, path.dirname(relative), 'node_modules');
          mkdirSync(path.dirname(target), { recursive: true });
          symlinkSync(modules, target, 'dir');
        }
      }
    }
    symlinkSync(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'dir');
    writeFileSync(
      path.join(fixture, 'pnpm-workspace.yaml'),
      `${readFileSync(path.join(fixture, 'pnpm-workspace.yaml'), 'utf8')}\nverifyDepsBeforeRun: false\n`
    );
    // Also read a newly introduced package config before it has been committed.
    if (existsSync(path.join(root, 'apps/admin-web/turbo.json'))) copy('apps/admin-web/turbo.json');
    for (const relative of [
      'apps/admin-web/vitest.config.ts',
      'apps/admin-web/__tests__/transportCancellation.test.ts',
      'apps/admin-web/app/container.ts',
      'apps/service-web/app/container.ts',
      'apps/service-web/lib/seo/url.ts',
      'apps/visual-web/app/container.ts',
    ])
      copy(relative);

    const baseline = task();
    const passed = execute();
    assert.equal(passed.status, 0, passed.output);
    assert.match(passed.output, /transportCancellation\.test\.ts/);
    assert.equal(task().cache.status, 'HIT', 'successful regression should populate the local cache');
    const repeated = execute();
    assert.equal(repeated.status, 0, repeated.output);
    assert.match(repeated.output, /cache hit/);
    assert.equal(task().hash, baseline.hash, 'unchanged inputs should reuse the same hash');

    for (const app of ['service-web', 'visual-web']) {
      const relative = `apps/${app}/app/container.ts`;
      const original = readFileSync(path.join(fixture, relative), 'utf8');
      const broken = original.replace(
        "import { HttpLink } from '@apollo/client/link/http';",
        "import { BatchHttpLink as HttpLink } from '@apollo/client/link/batch-http';"
      );
      assert.notEqual(broken, original, 'transport mutant must change the actual HTTP link');
      writeFileSync(path.join(fixture, relative), broken);
      const changed = task();
      assert.notEqual(changed.hash, baseline.hash, `${app} transport must invalidate admin test hash`);
      assert.equal(changed.cache.status, 'MISS');
      const failed = execute();
      assert.notEqual(failed.status, 0, failed.output);
      assert.match(failed.output, /transportCancellation\.test\.ts/);
      assert.match(failed.output, /AssertionError/);
      writeFileSync(path.join(fixture, relative), original);
      assert.equal(task().hash, baseline.hash, 'restoring the source should restore the successful cache');
    }

    for (const relative of ['apps/service-web/lib/seo/url.ts', 'apps/admin-web/app/container.ts']) {
      const target = path.join(fixture, relative);
      const original = readFileSync(target, 'utf8');
      writeFileSync(target, `${original}\n// cache invalidation probe\n`);
      assert.notEqual(task().hash, baseline.hash, `${relative} must invalidate admin test hash`);
      writeFileSync(target, original);
      assert.equal(task().hash, baseline.hash);
    }

    // Isolate execution to the cancellation suite above, and inspect the full
    // dependency graph here to verify shared-link propagation through ^test.
    const shared = path.join(fixture, 'libs/shared/utils-apollo-client/client/src/index.ts');
    const original = readFileSync(shared, 'utf8');
    const graphHash = task(true).hash;
    writeFileSync(shared, `${original}\n// shared-link cache invalidation probe\n`);
    assert.notEqual(task(true).hash, graphHash, 'shared link must invalidate admin test through its dependency task');
    writeFileSync(shared, original);
    assert.equal(task(true).hash, graphHash);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
