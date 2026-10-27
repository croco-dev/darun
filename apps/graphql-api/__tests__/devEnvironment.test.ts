import { afterEach, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const directories: string[] = [];
const devScript = resolve(__dirname, '../scripts/dev.cjs');

// Execute the real entry point; stop at the build boundary before any server or DB starts.
function runDev(files: Record<string, string>, env: Record<string, string> = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'darun-dev-env-'));
  directories.push(directory);
  for (const [name, contents] of Object.entries(files)) writeFileSync(join(directory, name), contents);
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      `
        const Module = require('node:module');
        const originalLoad = Module._load;
        let pluginEnv;
        Module._load = function(id, ...args) {
          if (id === '../esbuild.plugins.js') {
            pluginEnv = { ...process.env };
            return [];
          }
          if (id === 'esbuild') return {
            context: async () => {
              console.log(JSON.stringify({ env: process.env, pluginEnv }));
              return { watch: async () => {}, dispose: async () => {} };
            }
          };
          return originalLoad.call(this, id, ...args);
        };
        require(${JSON.stringify(devScript)});
      `,
    ],
    { cwd: directory, env, encoding: 'utf8', timeout: 10_000 }
  );
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toBe('');
  const output = JSON.parse(result.stdout) as { env: Record<string, string>; pluginEnv: Record<string, string> };
  expect(output.pluginEnv).toEqual(output.env);
  return output.env;
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

it('외부 환경변수, 로컬 파일, 기본 파일 순으로 값을 선택하고 빈 값도 보존한다', () => {
  const env = runDev(
    {
      '.env': 'SHARED=base\nBASE_ONLY=base-only\nEXTERNAL=base\nEMPTY=base\nLOCAL_EMPTY=base\n',
      '.env.local': 'SHARED=local\nLOCAL_ONLY=local-only\nEXTERNAL=local\nEMPTY=local\nLOCAL_EMPTY=\n',
    },
    { EXTERNAL: 'shell', EMPTY: '' }
  );
  expect(env).toMatchObject({
    SHARED: 'local',
    BASE_ONLY: 'base-only',
    LOCAL_ONLY: 'local-only',
    EXTERNAL: 'shell',
    EMPTY: '',
    LOCAL_EMPTY: '',
    INFRA_ENV: 'local',
  });
});

it.each(['.env', '.env.local'])('%s 하나만 있어도 인용·개행·주석·export 문법을 읽는다', filename => {
  const env = runDev({
    [filename]: [
      'export EXPORTED=present',
      'INLINE=value # comment',
      'DOUBLE="  quoted # text  "',
      "SINGLE='single # text'",
      'MULTILINE="first',
      'second"',
      'ESCAPED="first\\nsecond"',
      'INFRA_ENV=fixture',
    ].join('\n'),
  });
  expect(env).toMatchObject({
    EXPORTED: 'present',
    INLINE: 'value',
    DOUBLE: '  quoted # text  ',
    SINGLE: 'single # text',
    MULTILINE: 'first\nsecond',
    ESCAPED: 'first\nsecond',
    INFRA_ENV: 'fixture',
  });
});

it('파일이 없어도 로컬 기본값을 적용하고 필수 설정값을 만들어내지 않는다', () => {
  const env = runDev({});
  expect(env.INFRA_ENV).toBe('local');
  expect(env.DATABASE_URL).toBeUndefined();
  expect(env.RUNNING_ENV).toBeUndefined();
});

it('외부에서 지정한 INFRA_ENV를 기본값이나 파일 값으로 덮지 않는다', () => {
  expect(runDev({ '.env.local': 'INFRA_ENV=local' }, { INFRA_ENV: 'external' }).INFRA_ENV).toBe('external');
});
