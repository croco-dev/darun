import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const { parse } = createRequire(import.meta.url)('yaml');
const workflow = parse(readFileSync(new URL('../.github/workflows/Deploy.yaml', import.meta.url), 'utf8'));

test('all production triggers serialize the full deployment without cancelling its running job', () => {
  assert.equal(workflow.jobs.deploy.concurrency?.group, 'prod-graphql');
  assert.equal(workflow.jobs.deploy.concurrency?.['cancel-in-progress'], false);
  assert.equal(workflow.jobs.deploy.needs, 'quality');
});

const head = 'a'.repeat(40);
const old = 'b'.repeat(40);
const script = fileURLToPath(new URL('./deployment-guard.mjs', import.meta.url));
const guardStep = workflow.jobs.deploy.steps.find((step) => step.id === 'revision');

test('the revision gate runs inside the lock before any dependency install or production access', () => {
  const steps = workflow.jobs.deploy.steps;
  assert.equal(steps[0].uses, 'actions/checkout@v6');
  assert.equal(steps[0].with.ref, '${{ github.sha }}');
  assert.equal(steps[1], guardStep);
  assert.equal(guardStep.run, 'node scripts/deployment-guard.mjs');
  assert.equal(guardStep.env.ALLOW_ROLLBACK, '${{ inputs.allow_rollback }}');
  assert.equal(workflow.on.workflow_dispatch.inputs.allow_rollback.default, false);
  for (const step of steps.slice(2))
    assert.equal(step.if, "steps.revision.outputs.deploy == 'true'", step.name ?? step.uses);
});

for (const event of ['push', 'repository_dispatch', 'workflow_dispatch']) {
  for (const [sha, rollback, expected] of [
    [head, '', true],
    [old, '', false],
    [old, 'true', event === 'workflow_dispatch'],
  ]) {
    test(`${event}: revision=${sha[0]}, rollback=${rollback || 'unset'} => deploy=${expected}`, () => {
      const result = runGuard({
        GITHUB_EVENT_NAME: event,
        GITHUB_SHA: sha,
        ALLOW_ROLLBACK: rollback,
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.output, `deploy=${expected}\n`);
    });
  }
}

for (const [name, overrides, response, code] of [
  ['API failure', {}, head, 1],
  ['invalid API response', {}, 'null', 0],
  ['missing revision', { GITHUB_SHA: '' }, head, 0],
  ['unsupported event', { GITHUB_EVENT_NAME: 'pull_request' }, head, 0],
  [
    'rollback does not bypass failed revision lookup',
    { GITHUB_EVENT_NAME: 'workflow_dispatch', ALLOW_ROLLBACK: 'true' },
    head,
    1,
  ],
]) {
  test(`${name} fails closed without enabling production steps`, () => {
    const result = runGuard(overrides, response, code);
    assert.notEqual(result.status, 0);
    assert.equal(result.output, '');
  });
}

function runGuard(overrides, response = head, code = 0) {
  const directory = mkdtempSync(path.join(tmpdir(), 'darun-deployment-guard-'));
  try {
    const output = path.join(directory, 'output');
    writeFileSync(output, '');
    writeFileSync(
      path.join(directory, 'gh'),
      `#!/bin/sh\n[ "$*" = "api --method GET repos/croco-dev/darun/commits/trunk --jq .sha" ] || exit 2\nprintf '%s\\n' '${response}'\nexit ${code}\n`,
      { mode: 0o755 }
    );
    const result = spawnSync(process.execPath, [script], {
      env: {
        ...process.env,
        PATH: `${directory}${path.delimiter}${process.env.PATH}`,
        GITHUB_EVENT_NAME: 'push',
        GITHUB_SHA: old,
        GITHUB_REPOSITORY: 'croco-dev/darun',
        GITHUB_OUTPUT: output,
        ALLOW_ROLLBACK: '',
        ...overrides,
      },
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.ifError(result.error);
    return { ...result, output: readFileSync(output, 'utf8') };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
