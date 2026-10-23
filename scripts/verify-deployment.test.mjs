import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { verifyDeployment } from './verify-deployment.mjs';

// A successful SST command alone must not mark a deployment healthy.
test('the deploy job requires the read-only API check after SST', async () => {
  const workflow = await readFile(new URL('../.github/workflows/Deploy.yaml', import.meta.url), 'utf8');
  const deploy = workflow.slice(workflow.indexOf('      - name: Deploy\n'));
  assert.match(deploy, /sst deploy --stage prod[\s\S]*- name: Verify deployed GraphQL/);
  assert.match(deploy, /run: node scripts\/verify-deployment\.mjs/);
  assert.doesNotMatch(deploy, /continue-on-error: true/);
});

const revision = 'e'.repeat(40);
const requestId = 'ab121234-1234-5678-9012-123456789abc';
async function fixture(t, handler) {
  const requests = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const input = JSON.parse(Buffer.concat(chunks).toString());
    requests.push({ path: req.url, method: req.method, ...input });
    res.setHeader('x-amzn-requestid', requestId);
    handler(input.query, res, requests.length);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    return new Promise(resolve => server.close(resolve));
  });
  return {
    endpoint: `http://127.0.0.1:${server.address().port}/graphql`,
    requests,
  };
}
function success(query, res) {
  res.end(
    JSON.stringify({
      data: query.includes('__typename') ? { __typename: 'Query' } : { categories: [] },
    })
  );
}
async function check(endpoint, options = {}) {
  const logs = [];
  const healthy = await verifyDeployment({
    endpoint,
    revision,
    attempts: 2,
    retryMs: 0,
    log: line => logs.push(JSON.parse(line)),
    ...options,
  });
  return { healthy, logs };
}

test('both read-only probes pass for an empty database without exposing IDs or server output', async t => {
  const { endpoint, requests } = await fixture(t, success);
  const { healthy, logs } = await check(endpoint);
  assert.equal(healthy, true);
  assert.deepEqual(requests, [
    { path: '/graphql', method: 'POST', query: 'query { __typename }' },
    {
      path: '/graphql',
      method: 'POST',
      query: 'query { categories(first: 1) { id } }',
    },
  ]);
  assert.deepEqual(
    logs.map(line => [line.probe, line.result, line.status, line.requestId]),
    [
      ['initialization', 'ok', 200, requestId],
      ['database', 'ok', 200, requestId],
    ]
  );
  assert.ok(logs.every(line => line.revision === revision && !Number.isNaN(Date.parse(line.time))));
});

for (const [name, body, status, result] of [
  [
    'GraphQL errors with partial data',
    {
      errors: [{ message: 'postgres://secret:user@private/db' }],
      data: { categories: [] },
    },
    200,
    'graphql_error',
  ],
  ['non-JSON response', '<html>postgres://secret:user@private/db</html>', 200, 'invalid_json'],
  ['missing data', {}, 200, 'invalid_data'],
  ['null categories', { data: { categories: null } }, 200, 'invalid_data'],
  ['invalid category ID', { data: { categories: [{ id: 123 }] } }, 200, 'invalid_data'],
  [
    'invalid errors shape',
    { errors: 'postgres://secret:user@private/db', data: { categories: [] } },
    200,
    'graphql_error',
  ],
  ['HTTP failure', { data: { categories: [] } }, 503, 'http_error'],
]) {
  test(`initialization success and database failure remain distinct: ${name}`, async t => {
    const { endpoint, requests } = await fixture(t, (query, res) => {
      if (query.includes('__typename')) return success(query, res);
      res.statusCode = status;
      res.setHeader('x-amzn-requestid', 'postgres://secret:user@private/db');
      res.end(typeof body === 'string' ? body : JSON.stringify(body));
    });
    const { healthy, logs } = await check(endpoint);
    assert.equal(healthy, false);
    assert.deepEqual(
      logs.map(line => line.result),
      ['ok', result, result]
    );
    assert.equal(requests.length, 3);
    assert.equal(logs[1].requestId, null);
    assert.doesNotMatch(JSON.stringify(logs), /secret|private|postgres/);
  });
}

test('invalid initialization data fails even when the independent database probe succeeds', async t => {
  const { endpoint, requests } = await fixture(t, (query, res) => {
    if (query.includes('__typename')) return res.end(JSON.stringify({ data: { __typename: 'Unexpected' } }));
    success(query, res);
  });
  const { healthy, logs } = await check(endpoint);
  assert.equal(healthy, false);
  assert.deepEqual(
    logs.map(line => [line.probe, line.result]),
    [
      ['initialization', 'invalid_data'],
      ['initialization', 'invalid_data'],
      ['database', 'ok'],
    ]
  );
  assert.equal(requests.length, 3);
});

test('a populated database is accepted and its ID is never logged', async t => {
  const { endpoint } = await fixture(t, (query, res) => {
    if (query.includes('__typename')) return success(query, res);
    res.end(
      JSON.stringify({
        data: { categories: [{ id: 'private-category' }] },
        errors: [],
      })
    );
  });
  const result = await check(endpoint);
  assert.equal(result.healthy, true);
  assert.doesNotMatch(JSON.stringify(result.logs), /private-category/);
});

test('transient failures recover within the retry bound', async t => {
  const { endpoint, requests } = await fixture(t, (query, res, count) => {
    if (count === 1) {
      res.statusCode = 502;
      res.end('unavailable');
    } else success(query, res);
  });
  const { healthy, logs } = await check(endpoint);
  assert.equal(healthy, true);
  assert.equal(requests.length, 3);
  assert.deepEqual(
    logs.map(line => [line.probe, line.attempt, line.result]),
    [
      ['initialization', 1, 'http_error'],
      ['initialization', 2, 'ok'],
      ['database', 1, 'ok'],
    ]
  );
});

for (const flushHeaders of [false, true]) {
  test(`timeouts cover ${flushHeaders ? 'stalled response bodies' : 'missing response headers'}`, async t => {
    const { endpoint } = await fixture(t, (_query, res) => {
      if (flushHeaders) {
        res.writeHead(200);
        res.write('{"data":');
      }
    });
    const { healthy, logs } = await check(endpoint, { timeoutMs: 100 });
    assert.equal(healthy, false);
    assert.deepEqual(
      logs.map(line => line.result),
      ['timeout', 'timeout', 'timeout', 'timeout']
    );
    assert.deepEqual(
      logs.map(line => line.probe),
      ['initialization', 'initialization', 'database', 'database']
    );
  });
}

test('oversized responses and redirects fail without following the target', async t => {
  const { endpoint, requests } = await fixture(t, (query, res) => {
    if (query.includes('__typename')) return res.end('x'.repeat(65_537));
    res.writeHead(302, { location: '/unexpected' });
    res.end();
  });
  const { healthy, logs } = await check(endpoint, { attempts: 1 });
  assert.equal(healthy, false);
  assert.deepEqual(
    logs.map(line => line.result),
    ['response_too_large', 'network_error']
  );
  assert.equal(requests.length, 2);
});

async function cli(t, output, workflow = false) {
  const dir = await mkdtemp(join(tmpdir(), 'darun-smoke-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'apps/graphql-api/.sst'), { recursive: true });
  await writeFile(join(dir, 'apps/graphql-api/.sst/outputs.json'), JSON.stringify(output));
  await mkdir(join(dir, 'scripts'));
  await copyFile(new URL('./verify-deployment.mjs', import.meta.url), join(dir, 'scripts/verify-deployment.mjs'));
  let executable = process.execPath;
  let args;
  if (workflow) {
    const pnpm = join(dir, 'pnpm');
    await writeFile(pnpm, '#!/bin/sh\nexit 0\n');
    await chmod(pnpm, 0o700);
    const source = await readFile(new URL('../.github/workflows/Deploy.yaml', import.meta.url), 'utf8');
    const steps = source.slice(source.indexOf('      - name: Deploy\n'));
    const commands = [...steps.matchAll(/^        run: (.+)$/gm)].map(match => match[1]);
    executable = '/bin/bash';
    args = ['-e', '-c', commands.join('\n')];
  }
  const child = spawn(executable, args ?? [join(dir, 'scripts/verify-deployment.mjs')], {
    cwd: dir,
    env: {
      ...process.env,
      PATH: `${dir}:${process.env.PATH}`,
      GITHUB_SHA: revision,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => {
    stdout += chunk;
  });
  child.stderr.on('data', chunk => {
    stderr += chunk;
  });
  const [code] = await once(child, 'close');
  return { code, stdout, stderr };
}

test('the deployed-output CLI succeeds only after both real HTTP queries pass', async t => {
  const { endpoint, requests } = await fixture(t, success);
  const result = await cli(t, {
    api: endpoint.replace('/graphql', ''),
    other: 'secret',
  });
  assert.equal(result.code, 0);
  assert.equal(requests.length, 2);
  assert.doesNotMatch(result.stdout + result.stderr, /secret/);
});

test('database failure makes the real deployment command exit nonzero after bounded retries', async t => {
  const { endpoint, requests } = await fixture(t, (query, res) => {
    if (query.includes('__typename')) return success(query, res);
    res.end(JSON.stringify({ errors: [{ message: 'secret-database-credential' }] }));
  });
  const result = await cli(t, { api: endpoint.replace('/graphql', '') }, true);
  assert.equal(result.code, 1);
  assert.equal(requests.length, 4);
  const logs = result.stdout.trim().split('\n').map(JSON.parse);
  assert.deepEqual(
    logs.map(line => line.result),
    ['ok', 'graphql_error', 'graphql_error', 'graphql_error']
  );
  assert.doesNotMatch(result.stdout + result.stderr, /secret-database-credential/);
});

test('missing or credential-bearing outputs fail closed without echoing the output', async t => {
  for (const output of [{}, { api: 'https://user:secret@example.com' }, { api: 'https://example.com/?secret=key' }]) {
    const result = await cli(t, output);
    assert.equal(result.code, 1);
    assert.doesNotMatch(result.stdout + result.stderr, /user|secret|example/);
  }
});
