import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = relative => JSON.parse(readFileSync(path.join(root, relative), 'utf8'));

test('package and root lint reject errors in nested TypeScript and TSX sources', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'darun-lint-coverage-'));
  const packages = ['libs/products/datasource', 'libs/shared/ui'];
  const rootPackage = readJson('package.json');
  const env = { ...process.env, PATH: `${path.join(root, 'node_modules/.bin')}${path.delimiter}${process.env.PATH}` };
  const run = (command, cwd) => {
    const result = spawnSync('sh', ['-c', command], { cwd, env, encoding: 'utf8', timeout: 60_000 });
    assert.ifError(result.error);
    return { status: result.status, output: `${result.stdout}${result.stderr}` };
  };

  try {
    writeFileSync(
      path.join(fixture, 'package.json'),
      JSON.stringify({
        name: 'lint-coverage-fixture',
        private: true,
        packageManager: rootPackage.packageManager,
        scripts: { lint: rootPackage.scripts.lint },
      })
    );
    writeFileSync(path.join(fixture, 'pnpm-workspace.yaml'), 'packages:\n  - "libs/*/*"\nverifyDepsBeforeRun: false\n');
    writeFileSync(
      path.join(fixture, 'pnpm-lock.yaml'),
      "lockfileVersion: '9.0'\nimporters:\n  .: {}\n  libs/products/datasource: {}\n  libs/shared/ui: {}\n"
    );
    writeFileSync(path.join(fixture, 'turbo.json'), readFileSync(path.join(root, 'turbo.json')));
    writeFileSync(
      path.join(fixture, 'eslint.config.mjs'),
      `export { default } from ${JSON.stringify(path.join(root, 'eslint.config.mjs'))};\n`
    );
    symlinkSync(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'dir');

    for (const relative of packages) {
      const directory = path.join(fixture, relative);
      const manifest = readJson(`${relative}/package.json`);
      mkdirSync(path.join(directory, 'src/deep/nested'), { recursive: true });
      writeFileSync(
        path.join(directory, 'package.json'),
        JSON.stringify({ name: manifest.name, scripts: { lint: manifest.scripts.lint } })
      );
      const configPath = path.join(root, relative, 'eslint.config.mjs');
      if (existsSync(configPath)) {
        writeFileSync(path.join(directory, 'eslint.config.mjs'), readFileSync(configPath));
      }
      writeFileSync(path.join(directory, 'src/index.ts'), 'export const index = 1;\n');
      for (const extension of ['ts', 'tsx']) {
        writeFileSync(path.join(directory, `src/deep/nested/probe.${extension}`), 'export const value: any = 1;\n');
      }
      const result = run(manifest.scripts.lint, directory);
      assert.equal(result.status, 1, result.output);
      assert.match(result.output, /probe\.ts\b/);
      assert.match(result.output, /probe\.tsx\b/);
      assert.match(result.output, /@typescript-eslint\/no-explicit-any/);
    }

    const failed = run(rootPackage.scripts.lint, fixture);
    assert.equal(failed.status, 1, failed.output);
    assert.match(failed.output, /probe\.tsx?\b/);
    assert.match(failed.output, /@typescript-eslint\/no-explicit-any/);

    for (const relative of packages) {
      const directory = path.join(fixture, relative);
      for (const extension of ['ts', 'tsx']) {
        writeFileSync(path.join(directory, `src/deep/nested/probe.${extension}`), 'export const value: number = 1;\n');
      }
      for (const generated of ['src/__generated__', 'dist', 'build', 'coverage']) {
        mkdirSync(path.join(directory, generated), { recursive: true });
        writeFileSync(path.join(directory, generated, 'generated.ts'), 'export const broken = ;\n');
      }
      const passed = run(readJson(`${relative}/package.json`).scripts.lint, directory);
      assert.equal(passed.status, 0, passed.output);
    }
    const passed = run(rootPackage.scripts.lint, fixture);
    assert.equal(passed.status, 0, passed.output);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
