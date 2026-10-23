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

// Never include server bodies, error messages, URLs or category IDs in deployment logs.
export async function verifyDeployment({
  endpoint,
  revision,
  attempts = 3,
  timeoutMs = 10_000,
  retryMs = 2_000,
  log = console.log,
}) {
  let healthy = true;
  for (const probe of probes) {
    let passed = false;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const signal = AbortSignal.timeout(timeoutMs);
      let status = null;
      let requestId = null;
      let result = 'network_error';
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
        // Bound memory even if a proxy returns an unrelated page or an unending stream.
        let body = '';
        let size = 0;
        const decoder = new TextDecoder();
        for await (const chunk of response.body ?? []) {
          size += chunk.byteLength;
          if (size > 65_536) throw new Error('response_too_large');
          body += decoder.decode(chunk, { stream: true });
        }
        body += decoder.decode();
        if (status !== 200) {
          result = 'http_error';
        } else {
          result = 'invalid_json';
          const payload = JSON.parse(body);
          if (payload?.errors !== undefined && (!Array.isArray(payload.errors) || payload.errors.length > 0)) {
            result = 'graphql_error';
          } else {
            result = probe.valid(payload?.data) ? 'ok' : 'invalid_data';
          }
        }
      } catch (error) {
        if (signal.aborted) result = 'timeout';
        else if (error?.message === 'response_too_large') result = 'response_too_large';
      }
      log(
        JSON.stringify({
          revision: /^[a-f0-9]{40}$/i.test(revision ?? '') ? revision : 'unknown',
          time: new Date().toISOString(),
          probe: probe.name,
          attempt,
          status,
          requestId,
          result,
        })
      );
      if (result === 'ok') {
        passed = true;
        break;
      }
      if (attempt < attempts) await delay(retryMs);
    }
    healthy = passed && healthy;
  }
  return healthy;
}

export async function main(outputsPath = 'apps/graphql-api/.sst/outputs.json') {
  try {
    const outputs = JSON.parse(await readFile(outputsPath, 'utf8'));
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
  process.exitCode = await main(process.argv[2]);
}
