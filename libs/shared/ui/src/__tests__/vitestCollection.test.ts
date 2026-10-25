// @vitest-environment node

import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('../../../../../', import.meta.url));

it('executes nested TS and TSX tests and propagates either assertion failure', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'darun-vitest-collection-'));
  const probe = (extension: string, passes: boolean) => {
    writeFileSync(
      path.join(fixture, `src/lib/deep/probe.test.${extension}`),
      `import { expect, it } from 'vitest';
it('${extension} probe', () => {
  const element: HTMLElement = document.createElement('section');
  expect(element.tagName).toBe(${JSON.stringify(passes ? 'SECTION' : 'ARTICLE')});
});
`
    );
  };
  const run = (testFile?: string) => {
    const report = path.join(fixture, 'report.json');
    rmSync(report, { force: true });
    const result = spawnSync(
      process.execPath,
      [
        path.join(root, 'node_modules/vitest/vitest.mjs'),
        'run',
        ...(testFile ? [testFile] : []),
        '--reporter=json',
        `--outputFile=${report}`,
        '--maxWorkers=1',
      ],
      { cwd: fixture, encoding: 'utf8', timeout: 30_000 }
    );
    expect(result.error, `${result.stdout}${result.stderr}`).toBeUndefined();
    return {
      status: result.status,
      report: JSON.parse(readFileSync(report, 'utf8')),
    };
  };

  try {
    symlinkSync(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'dir');
    writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ type: 'module' }));
    writeFileSync(
      path.join(fixture, 'vitest.config.ts'),
      `import { createJsdomConfig } from ${JSON.stringify(path.join(root, 'libs/shared/utils-vitest-config/src/index.ts'))};
export default createJsdomConfig();
`
    );
    mkdirSync(path.join(fixture, 'src/lib/deep'), { recursive: true });
    mkdirSync(path.join(fixture, 'src/__tests__'), { recursive: true });
    const legacy = path.join(fixture, 'src/__tests__/legacy.test.ts');
    writeFileSync(
      legacy,
      "import { expect, it } from 'vitest'; it('legacy probe', () => expect(document.body).toBeTruthy());\n"
    );
    probe('ts', true);
    probe('tsx', true);

    const success = run();
    expect(success.status).toBe(0);
    expect(success.report.numPassedTests).toBe(3);
    for (const extension of ['ts', 'tsx']) {
      probe(extension, false);
      const failure = run(`src/lib/deep/probe.test.${extension}`);
      expect(failure.status).toBe(1);
      expect(failure.report.numFailedTests).toBe(1);
      expect(
        failure.report.testResults.flatMap(
          (result: { assertionResults: { fullName: string; status: string }[] }) => result.assertionResults
        )
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fullName: `${extension} probe`,
            status: 'failed',
          }),
        ])
      );
      probe(extension, true);
    }

    rmSync(path.join(fixture, 'src'), { recursive: true });
    expect(run().status).toBe(0);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);
