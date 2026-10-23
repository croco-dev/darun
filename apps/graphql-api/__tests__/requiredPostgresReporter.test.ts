import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const vitestDirectory = dirname(require.resolve('vitest/package.json'));
const reporter = resolve(__dirname, '../scripts/required-postgres-reporter.ts');
const urls = {
  JOB_CONFIG_ATTEMPTS_TEST_DATABASE_URL: 'postgresql://sync:sync@127.0.0.1:55437/darun_job_config_attempts',
  TRANSLATION_TEST_DATABASE_URL: 'postgresql://sync:sync@127.0.0.1:55437/darun_translation_integrity',
  ATOMIC_TEST_DATABASE_URL: 'postgresql://sync:sync@127.0.0.1:55437/darun_atomic_integrity',
};

function runFixture(body: string, missingUrl?: keyof typeof urls) {
  const directory = mkdtempSync(join(tmpdir(), 'darun-required-postgres-'));
  try {
    writeFileSync(join(directory, 'vitest.config.mjs'), "export default {test: {include: ['fixture.test.mjs']}};");
    writeFileSync(
      join(directory, 'fixture.test.mjs'),
      `import {it, expect} from ${JSON.stringify(join(vitestDirectory, 'dist/index.js'))};\n${body}`
    );
    const env = { ...process.env, ...urls };
    if (missingUrl) delete env[missingUrl];
    return spawnSync(
      process.execPath,
      [join(vitestDirectory, 'vitest.mjs'), 'run', '--root', directory, '--reporter', reporter],
      { cwd: directory, env, encoding: 'utf8', timeout: 20_000 }
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe('required PostgreSQL CI reporter at the Vitest process boundary', () => {
  it.each(Object.keys(urls) as (keyof typeof urls)[])('fails before running when %s is missing', name => {
    const result = runFixture("it('passes', () => expect(2 + 3).toBe(5));", name);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`Required PostgreSQL test URL is missing: ${name}`);
  });

  it.each([
    ['all skipped', "it.skip('skipped', () => {});"],
    ['partially skipped', "it('passes', () => {}); it.skip('skipped', () => {});"],
    ['todo', "it.todo('not implemented');"],
    ['no tests', ''],
    ['regression assertion', "it('regression', () => expect(2 + 3).toBe(6));"],
  ])('fails the command for %s', (_name, body) => {
    const result = runFixture(body);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
  });

  it('succeeds and reports the executed count only when every test passes', () => {
    const result = runFixture("it('passes', () => expect(2 + 3).toBe(5));");
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('1/1 passed, 0 skipped');
  });
});
