// @vitest-environment node

import { expect, it, onTestFinished } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('../../../../../', import.meta.url));

it('executes nested TS and TSX tests and propagates either assertion failure', async () => {
  const controller = new AbortController();
  const cases = ['success', 'ts', 'tsx', 'empty'] as const;
  const runs = cases.map(async scenario => {
    const fixture = mkdtempSync(path.join(tmpdir(), 'darun-vitest-collection-'));
    const probe = (extension: string) => {
      writeFileSync(
        path.join(fixture, `src/lib/deep/probe.test.${extension}`),
        `import { expect, it } from 'vitest';
it('${extension} probe', () => {
  const element: HTMLElement = document.createElement('section');
  expect(element.tagName).toBe(${JSON.stringify(extension === scenario ? 'ARTICLE' : 'SECTION')});
});
`
      );
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
      writeFileSync(
        path.join(fixture, 'src/__tests__/legacy.test.ts'),
        "import { expect, it } from 'vitest'; it('legacy probe', () => expect(document.body).toBeTruthy());\n"
      );
      probe('ts');
      probe('tsx');
      if (scenario === 'empty') rmSync(path.join(fixture, 'src'), { recursive: true });

      const report = path.join(fixture, 'report.json');
      const result = await new Promise<{
        status: number;
        stdout: string;
        stderr: string;
      }>((resolve, reject) => {
        const child = execFile(
          process.execPath,
          [
            path.join(root, 'node_modules/vitest/vitest.mjs'),
            'run',
            ...(scenario === 'ts' || scenario === 'tsx' ? [`src/lib/deep/probe.test.${scenario}`] : []),
            '--reporter=json',
            `--outputFile=${report}`,
            '--maxWorkers=1',
            // These probes share no state and only verify collection and DOM execution.
            '--no-isolate',
          ],
          {
            cwd: fixture,
            encoding: 'utf8',
            timeout: 30_000,
          },
          (error, stdout, stderr) => {
            controller.signal.removeEventListener('abort', abort);
            if (!error) {
              resolve({ status: 0, stdout, stderr });
            } else if (typeof error.code === 'number' && !error.killed) {
              resolve({ status: error.code, stdout, stderr });
            } else {
              reject(error);
            }
          }
        );
        const abort = () => {
          child.kill();
        };
        controller.signal.addEventListener('abort', abort, { once: true });
      });
      const output = JSON.parse(readFileSync(report, 'utf8'));
      expect(result.status, `${scenario}: ${result.stdout}${result.stderr}`).toBe(
        scenario === 'ts' || scenario === 'tsx' ? 1 : 0
      );
      if (scenario === 'success') expect(output.numPassedTests).toBe(3);
      if (scenario === 'ts' || scenario === 'tsx') {
        expect(output.numFailedTests).toBe(1);
        expect(
          output.testResults.flatMap(
            (test: { assertionResults: { fullName: string; status: string }[] }) => test.assertionResults
          )
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              fullName: `${scenario} probe`,
              status: 'failed',
            }),
          ])
        );
      }
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
  // Keep all four CLI verdicts independent without accumulating their startup times.
  // Cancellation also closes a child before its fixture is removed on test timeout.
  onTestFinished(async () => {
    controller.abort();
    await Promise.allSettled(runs);
  });
  const results = await Promise.allSettled(runs);
  for (const result of results) {
    if (result.status === 'rejected') throw result.reason;
  }
}, 30_000);
