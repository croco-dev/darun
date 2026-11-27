import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const rootPackage = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

test('root lint rejects errors in nested sources of every package and skips generated output', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'darun-lint-coverage-'));
  const packages = ['libs/products/datasource', 'libs/shared/ui', 'apps/graphql-api'];
  const probes = ['ts', 'tsx', 'mjs', 'cjs'];
  const env = { ...process.env, PATH: `${path.join(root, 'node_modules/.bin')}${path.delimiter}${process.env.PATH}` };
  const lint = () => {
    const result = spawnSync('sh', ['-c', rootPackage.scripts.lint], {
      cwd: fixture,
      env,
      encoding: 'utf8',
      timeout: 120_000,
    });
    assert.ifError(result.error);
    return { status: result.status, output: `${result.stdout}${result.stderr}` };
  };
  const valid = extension => (extension === 'cjs' ? 'module.exports = 1;\n' : 'export const value = 1;\n');
  const writeProbes = source => {
    for (const relative of packages) {
      const directory = path.join(fixture, relative, 'src/deep/nested');
      mkdirSync(directory, { recursive: true });
      for (const extension of probes) writeFileSync(path.join(directory, `probe.${extension}`), source(extension));
    }
  };

  try {
    for (const config of ['oxlint.config.mts', '.oxfmtrc.json']) {
      copyFileSync(path.join(root, config), path.join(fixture, config));
    }
    writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
    // Like the repository, keep the linked dependencies out of the source walk.
    writeFileSync(path.join(fixture, '.gitignore'), 'node_modules\n');
    symlinkSync(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'dir');

    // `await 1` is reported only when the type-aware rules actually run through tsrs-lint.
    writeProbes(extension =>
      extension.startsWith('t')
        ? 'export const value: any = 1;\nexport async function settle() {\n  await 1;\n}\n'
        : `const unused = 1;\n${valid(extension)}`
    );
    const failed = lint();
    assert.equal(failed.status, 1, failed.output);
    for (const relative of packages) {
      for (const extension of probes) {
        assert.match(failed.output, new RegExp(`${relative}/src/deep/nested/probe\\.${extension}\\b`));
      }
    }
    assert.match(failed.output, /no-explicit-any/);
    assert.match(failed.output, /no-unused-vars/);
    assert.match(failed.output, /await-thenable/);

    writeProbes(valid);
    for (const relative of packages) {
      for (const generated of ['src/__generated__', 'dist', 'build', 'coverage']) {
        mkdirSync(path.join(fixture, relative, generated), { recursive: true });
        writeFileSync(path.join(fixture, relative, generated, 'generated.ts'), 'export const broken = ;\n');
      }
    }
    const passed = lint();
    assert.equal(passed.status, 0, passed.output);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
