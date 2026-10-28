import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const { parse } = createRequire(import.meta.url)('yaml');
const root = resolve(__dirname, '../../..');
interface Step {
  run?: string;
  env?: Record<string, string>;
  if?: string;
  'continue-on-error'?: boolean;
}
interface Workflow {
  on: Record<string, unknown>;
  jobs: Record<
    string,
    {
      steps: Step[];
      env?: Record<string, string>;
      needs?: string;
      if?: string;
      services?: Record<string, { image: string; env: Record<string, string>; ports: string[] }>;
    }
  >;
}

function workflow(name: string): Workflow {
  return parse(readFileSync(join(root, '.github/workflows', name), 'utf8'));
}

describe('Tier duplicate cleanup CI prerequisites', () => {
  it.each(['PullRequest.yaml', 'TierWeb.yaml'])('%s runs a mandatory isolated database gate', name => {
    const config = workflow(name);
    const build = config.jobs.build;
    const gate = build.steps.find(step => step.env?.REQUIRED_POSTGRES_GROUP === 'tier');
    expect(gate).toBeDefined();
    expect(gate?.if).toBeUndefined();
    expect(gate?.['continue-on-error']).not.toBe(true);
    expect(gate?.env?.DEDUPE_TEST_DATABASE_URL).toMatch(/\/darun_tier_dedupe$/);
    expect(gate?.run).toContain('pnpm --filter tier-web exec vitest run src/remove-duplicates.pg.test.ts');
    expect(gate?.run).toContain('--reporter=default');
    expect(gate?.run).toContain(
      '--reporter="$GITHUB_WORKSPACE/apps/graphql-api/scripts/required-postgres-reporter.ts"'
    );
    const services = Object.values(build.services ?? {});
    expect(services.some(service => service.image === 'postgres:17')).toBe(true);
    const databaseCreation = build.steps.find(step => step.run?.includes('CREATE DATABASE darun_tier_dedupe'));
    expect(databaseCreation).toBeDefined();
    expect(build.steps.indexOf(databaseCreation!)).toBeLessThan(build.steps.indexOf(gate!));
    expect(databaseCreation?.run).toContain('ON_ERROR_STOP=1');
    expect(databaseCreation?.run).not.toContain('DATABASE_URL');
  });

  it('keeps the gate on PRs and requires a successful build before deployment', () => {
    expect(workflow('PullRequest.yaml').on).toHaveProperty('pull_request');
    const deploy = workflow('TierWeb.yaml').jobs.deploy;
    expect(deploy.needs).toBe('build');
    expect(deploy.if).toBe('${{ inputs.deploy == true }}');
  });

  it('limits synthetic public configuration to build-only runs and keeps deployment on real values', () => {
    const config = workflow('TierWeb.yaml');
    for (const [name, fallback] of [
      ['NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.invalid'],
      ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_ci_build_only'],
    ]) {
      expect(config.jobs.build.env?.[name]).toBe(
        `\${{ vars.${name} || (inputs.deploy == false && '${fallback}') || '' }}`
      );
      const deploymentCheck = config.jobs.deploy.steps.find(step =>
        step.run?.includes('Missing TIER_CLOUDFLARE_API_TOKEN')
      );
      expect(deploymentCheck?.env?.[name]).toBe(`\${{ vars.${name} }}`);
    }
  });

  it.each([
    [0, true, 0],
    [17, true, 17],
    [0, false, 1],
  ] as const)(
    'Tier gate exit %i and resolved build environment %s preserve the prerequisite',
    (exitCode, configured, expected) => {
      const directory = mkdtempSync(join(tmpdir(), 'darun-tier-ci-'));
      try {
        const log = join(directory, 'calls');
        writeFileSync(log, '');
        for (const command of ['pnpm', 'docker']) {
          const executable = join(directory, command);
          writeFileSync(
            executable,
            `#!/bin/sh
printf '%s\\n' "$*" >> "$TIER_CI_LOG"
case "$*" in *src/remove-duplicates.pg.test.ts*) exit "$TIER_CI_GATE_EXIT";; esac
`
          );
          chmodSync(executable, 0o755);
        }
        const steps = workflow('TierWeb.yaml').jobs.build.steps.filter(step => step.run);
        const result = spawnSync(
          '/bin/sh',
          ['-e', '-c', steps.map(step => step.run?.replace(/\$\{\{[^}]+\}\}/g, 'fixture-service')).join('\n')],
          {
            encoding: 'utf8',
            timeout: 5000,
            env: {
              PATH: `${directory}:${process.env.PATH}`,
              GITHUB_WORKSPACE: root,
              NEXT_PUBLIC_SUPABASE_URL: configured ? 'https://supabase.invalid' : '',
              NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'ci-fixture',
              TIER_CI_LOG: log,
              TIER_CI_GATE_EXIT: String(exitCode),
            },
          }
        );
        expect(result.error).toBeUndefined();
        expect(result.status, result.stderr).toBe(expected);
        const calls = readFileSync(log, 'utf8').split('\n');
        expect(calls.some(call => call.includes('src/remove-duplicates.pg.test.ts'))).toBe(true);
        expect(calls.includes('--filter tier-web run cloudflare:build')).toBe(exitCode === 0 && configured);
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    }
  );
});
