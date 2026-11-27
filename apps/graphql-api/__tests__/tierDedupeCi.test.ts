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

// PR CI runs the database gates in their own job; Tier deploys only after the job that builds it.
const gateJobs: Record<string, string> = { 'PullRequest.yaml': 'integration', 'TierWeb.yaml': 'build' };

describe('Tier database CI prerequisites', () => {
  it.each(['PullRequest.yaml', 'TierWeb.yaml'])('%s runs a mandatory isolated database gate', name => {
    const build = workflow(name).jobs[gateJobs[name]!]!;
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

  it.each([
    ['PullRequest.yaml', 'content-sync-postgres'],
    ['TierWeb.yaml', 'tier-postgres'],
  ])('%s requires the shared PostgREST gate against its disposable PostgreSQL service', (name, service) => {
    const build = workflow(name).jobs[gateJobs[name]!]!;
    const serviceId = `\${{ job.services.${service}.id }}`;
    const gate = build.steps.find(step => step.run === `bash scripts/test-tier-postgrest-ci.sh "${serviceId}"`);
    expect(gate).toBeDefined();
    expect(gate?.if).toBeUndefined();
    expect(gate?.['continue-on-error']).not.toBe(true);
    expect(build.services?.[service]?.image).toBe('postgres:17');
  });

  it('builds Tier for deployment only after the PostgREST gate passes', () => {
    const build = workflow('TierWeb.yaml').jobs.build;
    const gate = build.steps.find(step => step.run?.startsWith('bash scripts/test-tier-postgrest-ci.sh'));
    const buildStep = build.steps.find(step => step.run === 'pnpm --filter tier-web run cloudflare:build');
    expect(gate).toBeDefined();
    expect(buildStep).toBeDefined();
    expect(build.steps.indexOf(gate!)).toBeLessThan(build.steps.indexOf(buildStep!));
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
    [0, 0, true, 0],
    [17, 0, true, 17],
    [0, 18, true, 18],
    [0, 0, false, 1],
  ] as const)(
    'Tier dedupe exit %i, PostgREST exit %i, and configured environment %s preserve the build prerequisite',
    (dedupeExit, postgrestExit, configured, expected) => {
      const directory = mkdtempSync(join(tmpdir(), 'darun-tier-ci-'));
      try {
        const log = join(directory, 'calls');
        writeFileSync(log, '');
        for (const command of ['pnpm', 'docker', 'bash']) {
          const executable = join(directory, command);
          writeFileSync(
            executable,
            `#!/bin/sh
printf '%s\\n' "$*" >> "$TIER_CI_LOG"
case "$*" in
  *src/remove-duplicates.pg.test.ts*) exit "$TIER_CI_GATE_EXIT";;
  scripts/test-tier-postgrest-ci.sh" "*) exit "$TIER_CI_POSTGREST_EXIT";;
esac
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
              TIER_CI_GATE_EXIT: String(dedupeExit),
              TIER_CI_POSTGREST_EXIT: String(postgrestExit),
            },
          }
        );
        expect(result.error).toBeUndefined();
        expect(result.status, result.stderr).toBe(expected);
        const calls = readFileSync(log, 'utf8').split('\n');
        expect(calls.some(call => call.includes('src/remove-duplicates.pg.test.ts'))).toBe(true);
        expect(calls.includes('scripts/test-tier-postgrest-ci.sh fixture-service')).toBe(dedupeExit === 0);
        expect(calls.includes('--filter tier-web run cloudflare:build')).toBe(
          dedupeExit === 0 && postgrestExit === 0 && configured
        );
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    }
  );
});
