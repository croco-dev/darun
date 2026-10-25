import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
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

test('the installed commit hook checks index blobs without changing staged or unstaged content', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'darun-lint-staged-'));
  const env = {
    ...process.env,
    PATH: `${path.join(root, 'node_modules/.bin')}${path.delimiter}${process.env.PATH}`,
  };
  // A fixture must never inherit the invoking commit's index or repository.
  for (const name of ['GIT_INDEX_FILE', 'GIT_DIR', 'GIT_WORK_TREE', 'LEFTHOOK', 'LEFTHOOK_EXCLUDE', 'LEFTHOOK_ONLY']) {
    delete env[name];
  }
  const run = (command, args) => {
    const result = spawnSync(command, args, {
      cwd: fixture,
      env,
      encoding: 'utf8',
      timeout: 60_000,
    });
    assert.ifError(result.error);
    return {
      status: result.status,
      output: `${result.stdout}${result.stderr}`,
    };
  };
  const git = (...args) => {
    const result = run('git', args);
    assert.equal(result.status, 0, result.output);
    return result.output;
  };
  const hook = () => run('lefthook', ['run', 'pre-commit', '--no-auto-install', '--no-tty', '--colors', 'off']);
  const file = 'nested/space and $literal.js';
  const good = 'export const value = 17;\n';
  const fixable = 'export const value = 17\n';
  const check = (staged, working, expected) => {
    writeFileSync(path.join(fixture, file), staged);
    git('add', '--', file);
    writeFileSync(path.join(fixture, file), working);
    const beforeIndex = git('ls-files', '--stage');
    const result = hook();
    assert.equal(result.status, expected, result.output);
    assert.equal(git('show', `:0:${file}`), staged);
    assert.equal(git('ls-files', '--stage'), beforeIndex);
    assert.equal(readFileSync(path.join(fixture, file), 'utf8'), working);
    return result;
  };

  try {
    git('init', '--quiet');
    copyFileSync(path.join(root, 'lefthook.yml'), path.join(fixture, 'lefthook.yml'));
    mkdirSync(path.join(fixture, 'scripts'));
    if (existsSync(path.join(root, 'scripts/lint-staged.mjs'))) {
      copyFileSync(path.join(root, 'scripts/lint-staged.mjs'), path.join(fixture, 'scripts/lint-staged.mjs'));
    }
    symlinkSync(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'dir');
    writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ private: true }));
    writeFileSync(path.join(fixture, 'pnpm-workspace.yaml'), 'verifyDepsBeforeRun: false\n');
    writeFileSync(
      path.join(fixture, 'eslint.config.mjs'),
      "export default [{ files: ['**/*.js'], rules: { semi: ['error', 'always'], 'no-undef': 'error' } }];\n"
    );
    mkdirSync(path.join(fixture, 'nested'));

    const failed = check(fixable, fixable, 1);
    assert.match(failed.output, /semi/);
    check(good, good, 0);
    // The worktree is cleanly formatted, but the committed blob is not.
    check(fixable, good, 1);
    // Unstaged edits must neither fail the staged check nor get included in it.
    check(good, 'export const value = missing\n', 0);
    const unfixable = check('export const value = missing;\n', good, 1);
    assert.match(unfixable.output, /no-undef/);

    // Renames, deletions and a commit with no lintable paths use the same index.
    check(good, good, 0);
    git(
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '--quiet',
      '-m',
      'fixture'
    );
    git('mv', '--', file, 'nested/renamed.js');
    assert.equal(hook().status, 0);
    rmSync(path.join(fixture, 'nested/renamed.js'));
    git('add', '-u');
    assert.equal(hook().status, 0);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
