import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const vitestDirectory = dirname(require.resolve('vitest/package.json'));
const reporter = resolve(__dirname, '../scripts/required-postgres-reporter.ts');
const urls = {
  LLM_SETTING_TEST_DATABASE_URL: 'postgresql://sync:sync@127.0.0.1:55437/darun_llm_settings',
  DEDUPE_TEST_DATABASE_URL: 'postgresql://sync:sync@127.0.0.1:55437/darun_tier_dedupe',
  JOB_CONFIG_ATTEMPTS_TEST_DATABASE_URL: 'postgresql://sync:sync@127.0.0.1:55437/darun_job_config_attempts',
  TRANSLATION_TEST_DATABASE_URL: 'postgresql://sync:sync@127.0.0.1:55437/darun_translation_integrity',
  ALTERNATIVE_TEST_DATABASE_URL: 'postgresql://sync:sync@127.0.0.1:55437/darun_alternative_integrity',
  PRODUCT_DETAIL_TEST_DATABASE_URL: 'postgresql://sync:sync@127.0.0.1:55437/darun_detail_freshness',
  ATOMIC_TEST_DATABASE_URL: 'postgresql://sync:sync@127.0.0.1:55437/darun_atomic_integrity',
  DESCRIPTION_EVIDENCE_TEST_DATABASE_URL: 'postgresql://sync:sync@127.0.0.1:55437/darun_description_integrity',
  W4_DATABASE_URL: 'postgresql://sync:sync@127.0.0.1:55437/darun_lease_integrity',
  MIGRATION_BASELINE_TEST_DATABASE_URL: 'postgresql://sync:sync@127.0.0.1:55437/darun_migration_baseline',
};
const groups = {
  llm: ['__tests__/llmSettingConcurrency.pg.test.ts'],
  graphql: [
    '__tests__/jobConfigAttempts.pg.test.ts',
    '__tests__/translationIntegrity.pg.test.ts',
    '__tests__/alternativeReplacement.pg.test.ts',
    '__tests__/productDetailFreshness.pg.test.ts',
  ],
  products: [
    'src/__tests__/W3AtomicApplyMaterialize.pg.test.ts',
    'src/__tests__/descriptionEvidence.postgresql.test.ts',
    'src/__tests__/W4JobLeaseRecovery.pg.test.ts',
  ],
  baseline: ['__tests__/migrationBaseline.pg.test.ts'],
  tier: ['src/remove-duplicates.pg.test.ts'],
};
type Group = keyof typeof groups;
const passing = "it('passes', () => expect(2 + 3).toBe(5));";

function runFixture(group: Group, bodies: Record<string, string> = {}, omit: string[] = [], missingEnv?: string) {
  const directory = mkdtempSync(join(tmpdir(), 'darun-required-postgres-'));
  try {
    writeFileSync(
      join(directory, 'vitest.config.mjs'),
      // These synthetic files have no shared state. Reuse one worker within each
      // disposable CLI run; the real PostgreSQL suites keep their normal isolation.
      "export default {test: {include: ['**/*.test.ts'], passWithNoTests: true, isolate: false}};"
    );
    for (const file of groups[group]) {
      if (omit.includes(file)) continue;
      mkdirSync(dirname(join(directory, file)), { recursive: true });
      writeFileSync(
        join(directory, file),
        `import {it, expect} from ${JSON.stringify(join(vitestDirectory, 'dist/index.js'))};\n${bodies[file] ?? passing}`
      );
    }
    const env: Record<string, string | undefined> = {
      ...process.env,
      ...urls,
      W4_PG: '1',
      REQUIRED_POSTGRES_GROUP: group,
    };
    if (missingEnv) delete env[missingEnv];
    return spawnSync(
      process.execPath,
      [join(vitestDirectory, 'vitest.mjs'), 'run', '--maxWorkers=1', '--root', directory, '--reporter', reporter],
      {
        cwd: directory,
        env,
        encoding: 'utf8',
        timeout: 20_000,
      }
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function expectFailure(result: ReturnType<typeof runFixture>, message?: string) {
  expect(result.error).toBeUndefined();
  expect(result.status, result.stdout + result.stderr).toBe(1);
  if (message) expect(result.stdout + result.stderr).toContain(message);
}

describe('required PostgreSQL CI reporter at the Vitest process boundary', () => {
  it.each([
    ['llm', 'LLM_SETTING_TEST_DATABASE_URL'],
    ['graphql', 'JOB_CONFIG_ATTEMPTS_TEST_DATABASE_URL'],
    ['graphql', 'TRANSLATION_TEST_DATABASE_URL'],
    ['graphql', 'ALTERNATIVE_TEST_DATABASE_URL'],
    ['graphql', 'PRODUCT_DETAIL_TEST_DATABASE_URL'],
    ['products', 'ATOMIC_TEST_DATABASE_URL'],
    ['products', 'DESCRIPTION_EVIDENCE_TEST_DATABASE_URL'],
    ['products', 'W4_DATABASE_URL'],
    ['baseline', 'MIGRATION_BASELINE_TEST_DATABASE_URL'],
    ['tier', 'DEDUPE_TEST_DATABASE_URL'],
  ] as const)('fails before running when %s lacks %s', (group, name) => {
    expectFailure(runFixture(group, {}, [], name), `Required PostgreSQL test URL is missing: ${name}`);
  });

  it('requires an explicit suite group', () => {
    expectFailure(
      runFixture('graphql', {}, [], 'REQUIRED_POSTGRES_GROUP'),
      'Required PostgreSQL suite group is missing or unknown'
    );
  });

  it('requires the lease opt-in', () => {
    expectFailure(runFixture('products', {}, [], 'W4_PG'), 'Required PostgreSQL lease tests need W4_PG=1');
  });

  it.each(Object.keys(groups) as Group[])('succeeds and reports every collected suite in %s', group => {
    const result = runFixture(group);
    expect(result.error).toBeUndefined();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    for (const file of groups[group]) expect(result.stdout).toContain(`${file}: 1/1 passed, 0 skipped`);
  });

  it.each([
    ['tier', 'src/remove-duplicates.pg.test.ts'],
    ['graphql', '__tests__/alternativeReplacement.pg.test.ts'],
    ['graphql', '__tests__/productDetailFreshness.pg.test.ts'],
    ['products', 'src/__tests__/descriptionEvidence.postgresql.test.ts'],
    ['products', 'src/__tests__/W4JobLeaseRecovery.pg.test.ts'],
  ] as const)('fails when %s omits %s even though its other suites pass', (group, file) => {
    expectFailure(runFixture(group, {}, [file]), `Required PostgreSQL suite was not collected: ${file}`);
  });

  it('fails when no required suites are collected despite passWithNoTests', () => {
    expectFailure(runFixture('products', {}, groups.products));
  });

  describe.each([
    ['tier', 'src/remove-duplicates.pg.test.ts'],
    ['graphql', '__tests__/alternativeReplacement.pg.test.ts'],
    ['graphql', '__tests__/productDetailFreshness.pg.test.ts'],
    ['products', 'src/__tests__/descriptionEvidence.postgresql.test.ts'],
    ['products', 'src/__tests__/W4JobLeaseRecovery.pg.test.ts'],
  ] as const)('%s required suite %s', (group, file) => {
    it.each([
      ['all skipped', "it.skip('skipped', () => {});"],
      ['partially skipped', "it('passes', () => {}); it.skip('skipped', () => {});"],
      ['todo', "it.todo('not implemented');"],
      ['no tests', ''],
      ['regression assertion', "it('regression', () => expect(2 + 3).toBe(6));"],
    ])('fails the command for %s', (_name, body) => {
      expectFailure(runFixture(group, { [file]: body }));
    });
  });
});
