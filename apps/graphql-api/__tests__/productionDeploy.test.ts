import postgres from 'postgres';
import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const { parse } = createRequire(__filename)('yaml') as { parse: (_source: string) => DeploymentWorkflow };

interface DeploymentWorkflow {
  jobs: {
    deploy: {
      environment: { name: string };
      steps: Array<{ name?: string; run?: string; env?: Record<string, string> }>;
    };
  };
}

const directory = resolve(__dirname, '..');
const fixtures: string[] = [];

function runDeployment(
  options: {
    entry?: 'deploy' | 'predeploy:prod';
    env?: NodeJS.ProcessEnv;
    fail?: string;
    databaseUrl?: string;
    command?: string;
  } = {}
) {
  const fixture = mkdtempSync(join(tmpdir(), 'darun-deploy-'));
  fixtures.push(fixture);
  const log = join(fixture, 'commands');
  const flowSettingLog = join(fixture, 'flow-setting');
  writeFileSync(log, '');
  writeFileSync(flowSettingLog, '');
  for (const command of ['pnpm', 'sst']) {
    const executable = join(fixture, command);
    writeFileSync(
      executable,
      `#!/bin/sh
printf '%s\\n' '${command}'" $*" >> "$DEPLOY_TEST_LOG"
if [ "${command} $*" = "$DEPLOY_TEST_FAIL" ]; then exit 17; fi
if [ '${command}' = 'sst' ]; then
  printf '%s' "\${VISUAL_FLOW_WRITES_ENABLED-__unset__}" > "$DEPLOY_TEST_FLOW_SETTING_LOG"
fi
if [ "${command} $*" = 'pnpm --filter graphql-api exec sst deploy --stage prod' ]; then
  exec sst deploy --stage prod
fi
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
  const result = spawnSync('/bin/sh', ['-c', options.command ?? manifest.scripts[options.entry ?? 'deploy']], {
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
      VISUAL_FLOW_WRITES_ENABLED: undefined,
      DATABASE_URL: options.databaseUrl ?? 'postgres://synthetic:fixture@127.0.0.1:1/unused',
      DEPLOY_TEST_DATABASE_URL: options.databaseUrl ?? '',
      DEPLOY_TEST_NODE: process.execPath,
      DEPLOY_TEST_TSX: require.resolve('tsx/cli'),
      DEPLOY_TEST_LOG: log,
      DEPLOY_TEST_FLOW_SETTING_LOG: flowSettingLog,
      DEPLOY_TEST_FAIL: options.fail ?? '',
      ...options.env,
    },
  });
  return {
    ...result,
    calls: readFileSync(log, 'utf8').trim().split('\n').filter(Boolean),
    flowSetting: readFileSync(flowSettingLog, 'utf8'),
  };
}

async function lambdaFlowSettings(value: string | undefined): Promise<string[]> {
  const environments: Array<Record<string, string>> = [];
  class Queue {
    arn = 'synthetic-queue-arn';
    url = 'synthetic-queue-url';
    subscribe() {}
  }
  const exports: { default?: { run: () => Promise<unknown> } } = {};
  const source = readFileSync(join(directory, 'sst.config.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  runInNewContext(compiled.outputText, {
    exports,
    process: { env: { VISUAL_FLOW_WRITES_ENABLED: value } },
    $config: (config: unknown) => config,
    sst: {
      aws: {
        Queue,
        Function: class {
          arn = 'synthetic-function-arn';
          constructor(_name: string, options: { environment: Record<string, string> }) {
            environments.push(options.environment);
          }
        },
        CronV2: class {
          nodes = { schedule: { arn: 'synthetic-schedule-arn' } };
          constructor(_name: string, options: { function: { environment: Record<string, string> } }) {
            environments.push(options.function.environment);
          }
        },
        Router: class {
          url = 'https://synthetic.invalid';
        },
      },
    },
  });
  await exports.default!.run();
  expect(environments.length).toBeGreaterThan(0);
  return environments.map(env => env.VISUAL_FLOW_WRITES_ENABLED);
}

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

describe('production deployment entrypoints', () => {
  it('keeps the environment choice through consecutive CI deployments and an explicit disable', async () => {
    const workflow = parse(readFileSync(resolve(directory, '../../.github/workflows/Deploy.yaml'), 'utf8'));
    expect(workflow.jobs.deploy.environment.name).toBe('prod-graphql');
    const step = workflow.jobs.deploy.steps.find(item => item.name === 'Deploy')!;
    const expression = step.env!.VISUAL_FLOW_WRITES_ENABLED;
    // Only the vars lookup/default syntax used by this deployment is evaluated; no GitHub or AWS calls.
    const lookup = /^\$\{\{ vars\.([A-Z_]+) \|\| '([^']*)' \}\}$/.exec(expression);
    for (const [setting, expected] of [
      [undefined, 'false'],
      ['', 'false'],
      ['false', 'false'],
      ['true', 'true'],
      ['true', 'true'],
      ['false', 'false'],
    ]) {
      const variables: Record<string, string | undefined> = { VISUAL_FLOW_WRITES_ENABLED: setting };
      const value = lookup ? variables[lookup[1]] || lookup[2] : expression;
      const result = runDeployment({ command: step.run!, env: { VISUAL_FLOW_WRITES_ENABLED: value } });
      expect(result.status, result.stderr).toBe(0);
      expect(result.calls).toContain('sst deploy --stage prod');
      expect(result.flowSetting).toBe(expected);
      expect((await lambdaFlowSettings(result.flowSetting)).every(flag => flag === expected)).toBe(true);
    }
  });

  it.each([
    [undefined, 'false'],
    ['false', 'false'],
    ['true', 'true'],
  ])('manual deployment preserves %s and SST defaults it to %s', async (setting, expected) => {
    const result = runDeployment({ env: { VISUAL_FLOW_WRITES_ENABLED: setting } });
    expect(result.status, result.stderr).toBe(0);
    expect(result.flowSetting).toBe(setting ?? '__unset__');
    expect((await lambdaFlowSettings(setting)).every(flag => flag === expected)).toBe(true);
  });

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
