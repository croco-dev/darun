import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const directory = realpathSync(mkdtempSync(join(tmpdir(), 'darun-lambda-maps-')));
const appRoot = resolve(__dirname, '..');

beforeAll(() => {
  const tsconfig = JSON.parse(readFileSync(join(appRoot, 'tsconfig.lambda.json'), 'utf8'));
  writeFileSync(join(directory, 'tsconfig.lambda.json'), JSON.stringify({ ...tsconfig, include: ['*.ts'] }));
  writeFileSync(
    join(directory, 'decorated.ts'),
    [
      'function mark(target: Function) { return target; }',
      '@mark',
      'export class Decorated {',
      '  constructor(public dependency: Date) {}',
      '  explode() {',
      "    throw new Error('decorated sentinel');",
      '  }',
      '}',
    ].join('\n')
  );
  writeFileSync(
    join(directory, 'plain.ts'),
    ['export function explode() {', "  const message = 'plain sentinel';", '  throw new Error(message);', '}'].join(
      '\n'
    )
  );
  writeFileSync(
    join(directory, 'entry.ts'),
    [
      "import { Decorated } from './decorated';",
      "import { explode } from './plain';",
      "if (Reflect.getMetadata('design:paramtypes', Decorated)?.[0] !== Date) {",
      "  throw new Error('decorator metadata missing');",
      '}',
      "if (process.argv[2] === 'decorated') new Decorated(new Date()).explode();",
      'else explode();',
    ].join('\n')
  );

  const result = spawnSync(
    process.execPath,
    [
      '-e',
      `
        const Module = require('node:module');
        const originalLoad = Module._load;
        Module._load = function(id, ...args) {
          // Keep the actual deployment build and plugins; replace only inputs/output and remote upload.
          if (id === '@sentry/esbuild-plugin') return { sentryEsbuildPlugin: () => ({ name: 'no-upload', setup() {} }) };
          const loaded = originalLoad.call(this, id, ...args);
          if (id === 'esbuild') return {
            ...loaded,
            build: options => loaded.build({
              ...options,
              entryPoints: [${JSON.stringify(join(directory, 'entry.ts'))}],
              outdir: ${JSON.stringify(join(directory, 'bundle'))},
            }),
          };
          return loaded;
        };
        require(${JSON.stringify(join(appRoot, 'scripts/build-lambda.cjs'))});
      `,
    ],
    {
      cwd: directory,
      env: { ...process.env, INFRA_ENV: 'prod' },
      encoding: 'utf8',
      timeout: 15_000,
    }
  );
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
});

afterAll(() => rmSync(directory, { recursive: true, force: true }));

describe('배포 번들의 원본 TypeScript 위치', () => {
  it.each([
    ['decorated', 'decorated.ts', 6],
    ['plain', 'plain.ts', 3],
  ])('%s 오류가 원본 파일과 행을 가리키고 decorator metadata도 유지한다', (mode, filename, line) => {
    const result = spawnSync(process.execPath, ['--enable-source-maps', join(directory, 'bundle/entry.js'), mode], {
      encoding: 'utf8',
      timeout: 10_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${mode} sentinel`);
    expect(result.stderr).toContain(`${join(directory, filename)}:${line}:`);
  });

  it('최종 소스맵에는 실제 원본 경로만 기록하고 원문은 포함하지 않는다', () => {
    const map = JSON.parse(readFileSync(join(directory, 'bundle/entry.js.map'), 'utf8')) as {
      sources: string[];
      sourcesContent?: unknown;
    };
    expect(map.sources.map(source => resolve(directory, 'bundle', source)).sort()).toEqual(
      ['decorated.ts', 'entry.ts', 'plain.ts'].map(filename => join(directory, filename)).sort()
    );
    expect(map.sourcesContent).toBeUndefined();
    const bundle = readFileSync(join(directory, 'bundle/entry.js'), 'utf8');
    expect(bundle).not.toContain('sourceMappingURL=data:');
  });
});
