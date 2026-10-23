import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const probes = [
  {
    name: 'initialization',
    query: 'query { __typename }',
    valid: data => data?.__typename === 'Query',
  },
  {
    name: 'database',
    query: 'query { categories(first: 1) { id } }',
    valid: data =>
      Array.isArray(data?.categories) &&
      data.categories.length <= 1 &&
      data.categories.every(category => typeof category?.id === 'string' && category.id.length > 0),
  },
];

async function readBody(response) {
  let body = '';
  let size = 0;
  const decoder = new TextDecoder();
  for await (const chunk of response.body ?? []) {
    size += chunk.byteLength;
    if (size > 65_536) throw new Error('response_too_large');
    body += decoder.decode(chunk, { stream: true });
  }
  return body + decoder.decode();
}

function responseResult(status, body, probe) {
  if (status !== 200) return 'http_error';
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return 'invalid_json';
  }
  if (payload?.errors !== undefined && (!Array.isArray(payload.errors) || payload.errors.length > 0)) {
    return 'graphql_error';
  }
  return probe.valid(payload?.data) ? 'ok' : 'invalid_data';
}

async function requestProbe(endpoint, probe, timeoutMs) {
  const signal = AbortSignal.timeout(timeoutMs);
  let status = null;
  let requestId = null;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: probe.query }),
      redirect: 'error',
      signal,
    });
    status = response.status;
    const id = response.headers.get('x-amzn-requestid');
    if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id ?? '')) {
      requestId = id;
    }
    const body = await readBody(response);
    return { status, requestId, result: responseResult(status, body, probe) };
  } catch (error) {
    let result = 'network_error';
    if (signal.aborted) result = 'timeout';
    else if (error?.message === 'response_too_large') result = 'response_too_large';
    return { status, requestId, result };
  }
}

async function runProbe(options, probe, attempt = 1) {
  const { endpoint, revision, attempts, timeoutMs, retryMs, log } = options;
  const result = await requestProbe(endpoint, probe, timeoutMs);
  // Never include server bodies, error messages, URLs or category IDs in deployment logs.
  log(
    JSON.stringify({
      revision: /^[a-f0-9]{40}$/i.test(revision ?? '') ? revision : 'unknown',
      time: new Date().toISOString(),
      probe: probe.name,
      attempt,
      ...result,
    })
  );
  if (result.result === 'ok') return true;
  if (attempt >= attempts) return false;
  // The next attempt deliberately waits: parallel retries would remove the backoff.
  await delay(retryMs);
  return runProbe(options, probe, attempt + 1);
}

export async function verifyDeployment({
  endpoint,
  revision,
  attempts = 3,
  timeoutMs = 10_000,
  retryMs = 2_000,
  log = console.log,
}) {
  const options = { endpoint, revision, attempts, timeoutMs, retryMs, log };
  const initialization = await runProbe(options, probes[0]);
  // Always record the DB outcome, including when initialization exhausts its attempts.
  const database = await runProbe(options, probes[1]);
  return initialization && database;
}

export async function main() {
  try {
    const outputs = JSON.parse(
      await readFile(new URL('../apps/graphql-api/.sst/outputs.json', import.meta.url), 'utf8')
    );
    const api = new URL(outputs.api);
    // HTTP is accepted only for isolated local smoke fixtures.
    const local = api.protocol === 'http:' && ['127.0.0.1', '[::1]', 'localhost'].includes(api.hostname);
    if ((!local && api.protocol !== 'https:') || api.username || api.password || api.search || api.hash) {
      throw new Error('invalid_output');
    }
    api.pathname = `${api.pathname.replace(/\/$/, '')}/graphql`;
    const healthy = await verifyDeployment({
      endpoint: api,
      revision: process.env.GITHUB_SHA,
    });
    return healthy ? 0 : 1;
  } catch {
    console.error('Deployment verification failed: missing or invalid SST api output.');
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
