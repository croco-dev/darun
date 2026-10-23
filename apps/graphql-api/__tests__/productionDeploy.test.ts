import postgres from 'postgres';
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const directory = resolve(__dirname, '..');
const fixtures: string[] = [];

function runDeployment(
  options: {
    entry?: 'deploy' | 'predeploy:prod';
    env?: NodeJS.ProcessEnv;
    fail?: string;
    databaseUrl?: string;
  } = {}
) {
  const fixture = mkdtempSync(join(tmpdir(), 'darun-deploy-'));
  fixtures.push(fixture);
  const log = join(fixture, 'commands');
  writeFileSync(log, '');
  for (const command of ['pnpm', 'sst']) {
    const executable = join(fixture, command);
    writeFileSync(
      executable,
      `#!/bin/sh
printf '%s\\n' '${command}'" $*" >> "$DEPLOY_TEST_LOG"
if [ "${command} $*" = "$DEPLOY_TEST_FAIL" ]; then exit 17; fi
if [ "${command} $*" = 'pnpm run migrate' ] && [ -n "$DEPLOY_TEST_DATABASE_URL" ]; then
  exec "$DEPLOY_TEST_NODE" "$DEPLOY_TEST_TSX" scripts/migrate.ts
fi
`
    );
    chmodSync(executable, 0o755);
  }
  const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  const result = spawnSync('/bin/sh', ['-c', manifest.scripts[options.entry ?? 'deploy']], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 30000,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PATH: `${fixture}:${process.env.PATH}`,
      INFRA_ENV: 'prod',
      RUNNING_ENV: 'prod',
      LLM_CONTENT_CUTOVER_COMPLETED: undefined,
      DATABASE_URL: options.databaseUrl ?? 'postgres://synthetic:fixture@127.0.0.1:1/unused',
      DEPLOY_TEST_DATABASE_URL: options.databaseUrl ?? '',
      DEPLOY_TEST_NODE: process.execPath,
      DEPLOY_TEST_TSX: require.resolve('tsx/cli'),
      DEPLOY_TEST_LOG: log,
      DEPLOY_TEST_FAIL: options.fail ?? '',
      ...options.env,
    },
  });
  return { ...result, calls: readFileSync(log, 'utf8').trim().split('\n').filter(Boolean) };
}

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

describe('production deployment entrypoints', () => {
  it('checks the bundle, applies migrations, then deploys the prod stage', () => {
    const result = runDeployment();
    expect(result.status, result.stderr).toBe(0);
    expect(result.calls).toEqual([
      'pnpm run check:migrations',
      'pnpm run build:lambda',
      'pnpm run verify:lambda',
      'pnpm run migrate',
      'sst deploy --stage prod',
    ]);
  });

  it.each(['deploy', 'predeploy:prod'] as const)('%s proceeds without a completed cutover flag', entry => {
    for (const value of [undefined, 'false']) {
      const result = runDeployment({ entry, env: { LLM_CONTENT_CUTOVER_COMPLETED: value } });
      expect(result.status, result.stderr).toBe(0);
      expect(result.calls).toContain('pnpm run migrate');
      expect(result.calls.at(-1)).toBe(entry === 'deploy' ? 'sst deploy --stage prod' : 'pnpm run migrate');
    }
  });

  it.each(['deploy', 'predeploy:prod'] as const)(
    '%s blocks unsafe production environments before any command',
    entry => {
      for (const env of [
        { NODE_ENV: 'test' },
        { INFRA_ENV: 'local' },
        { RUNNING_ENV: 'local' },
        { DATABASE_URL: '' },
      ]) {
        const result = runDeployment({ entry, env });
        expect(result.status).toBe(1);
        expect(result.calls).toEqual([]);
        expect(result.stderr).not.toContain('synthetic:fixture');
      }
    }
  );

  it.each(['check:migrations', 'build:lambda', 'verify:lambda', 'migrate'])(
    'stops before SST when %s fails',
    script => {
      const result = runDeployment({ fail: `pnpm run ${script}` });
      expect(result.status).toBe(1);
      expect(result.calls.at(-1)).toBe(`pnpm run ${script}`);
      expect(result.calls.some(call => call.startsWith('sst '))).toBe(false);
      if (script !== 'migrate') expect(result.calls).not.toContain('pnpm run migrate');
    }
  );

  it('reports SST failure instead of successful deployment', () => {
    const result = runDeployment({ fail: 'sst deploy --stage prod' });
    expect(result.status).toBe(1);
  });

  it('uses the same prerequisite entrypoint in CI without bypassing migration failure', () => {
    const workflow = readFileSync(resolve(directory, '../../.github/workflows/Deploy.yaml'), 'utf8');
    expect(workflow).toContain('run: pnpm --filter graphql-api run predeploy:prod');
    const result = runDeployment({ entry: 'predeploy:prod', fail: 'pnpm run migrate' });
    expect(result.status).toBe(1);
    expect(result.calls).toEqual(['pnpm run migrate']);
  });
});

const databaseUrl = process.env.DEPLOY_TEST_DATABASE_URL;
(databaseUrl ? describe : describe.skip)('production deployment with isolated PostgreSQL', () => {
  it('both entrypoints apply pending SQL before SST and a repeated run keeps the journal unchanged', async () => {
    const target = new URL(databaseUrl!);
    if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.pathname !== '/darun_deploy_integrity') {
      throw new Error('Requires isolated local darun_deploy_integrity database');
    }
    const client = postgres(databaseUrl!, { max: 1 });
    try {
      const journal = JSON.parse(readFileSync(join(directory, 'scripts/migrations/meta/_journal.json'), 'utf8')) as {
        entries: Array<{ when: number }>;
      };
      for (const entry of ['deploy', 'predeploy:prod'] as const) {
        await client`drop schema if exists public cascade`;
        await client`drop schema if exists drizzle cascade`;
        await client`create schema public`;
        const result = runDeployment({ entry, databaseUrl });
        expect(result.status, result.stderr).toBe(0);
        const rows = await client`select created_at from drizzle.__drizzle_migrations order by created_at`;
        expect(rows.map(row => Number(row.created_at))).toEqual(journal.entries.map(item => item.when));
        const columns = await client`select column_name from information_schema.columns where table_name = 'products'`;
        expect(columns.map(row => row.column_name)).toContain('content_revision');
        const repeat = runDeployment({ entry, databaseUrl });
        expect(repeat.status, repeat.stderr).toBe(0);
        expect(await client`select created_at from drizzle.__drizzle_migrations order by created_at`).toEqual(rows);
      }
    } finally {
      await client.end();
    }
  }, 30000);
});
