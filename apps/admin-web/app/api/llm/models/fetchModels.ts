import { normalizeLlmEndpointBase } from '@darun/utils-llm';
import ipaddr from 'ipaddr.js';
import { lookup } from 'node:dns';
import type { ClientRequest, IncomingMessage } from 'node:http';
import { request as httpsRequest, type RequestOptions } from 'node:https';
import { isIP, type TcpSocketConnectOpts } from 'node:net';

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_UPSTREAM_BODY_BYTES = 2 * 1024 * 1024;

export type ParsedModelEndpoint = { baseUrl: string; modelsUrl: string; hostname: string };
export type UpstreamFetchFailure =
  | { kind: 'timeout' | 'redirect' | 'body-too-large' | 'encoding' | 'dns-not-public' | 'dns-failed' | 'network' }
  | { kind: 'status'; status: number };
export type UpstreamFetchResult =
  { ok: true; status: number; body: string } | { ok: false; failure: UpstreamFetchFailure };

const BLOCKED_HOSTNAME_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home', '.corp', '.localdomain'];

export function parseModelEndpoint(rawEndpoint: string): ParsedModelEndpoint | null {
  let url: URL;
  try {
    url = new URL(rawEndpoint.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || (url.port !== '' && url.port !== '443')) return null;
  // Even empty query/fragment delimiters are not base URL input.
  if (url.username || url.password || rawEndpoint.includes('?') || rawEndpoint.includes('#')) return null;

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (isIP(hostname.replace(/^\[|\]$/g, '')) || !hostname.includes('.')) return null;
  if (hostname === 'localhost' || BLOCKED_HOSTNAME_SUFFIXES.some(suffix => hostname.endsWith(suffix))) return null;

  url.hostname = hostname;
  const baseUrl = normalizeLlmEndpointBase(url.toString());
  return { baseUrl, modelsUrl: `${baseUrl}/models`, hostname };
}

function isPublicAddress(address: string): boolean {
  if (!ipaddr.isValid(address)) return false;
  const parsed = ipaddr.parse(address);
  const normalized = parsed instanceof ipaddr.IPv6 && parsed.isIPv4MappedAddress() ? parsed.toIPv4Address() : parsed;
  // Transition, documentation, multicast, shared, private and reserved ranges are not public providers.
  return normalized.range() === 'unicast';
}

export async function fetchModelsFromPinnedEndpoint(
  modelsUrl: string,
  apiKey: string | null
): Promise<UpstreamFetchResult> {
  const url = new URL(modelsUrl);
  const controller = new AbortController();
  const { promise, resolve } = Promise.withResolvers<UpstreamFetchResult>();
  let settled = false;
  let req: ClientRequest | undefined;
  let response: IncomingMessage | undefined;

  const finish = (result: UpstreamFetchResult) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    response?.destroy();
    req?.destroy();
    resolve(result);
  };
  // The same deadline covers DNS, TLS, headers and the entire streamed body.
  const timer = setTimeout(() => {
    finish({ ok: false, failure: { kind: 'timeout' } });
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  lookup(url.hostname, { all: true, verbatim: true }, (error, addresses) => {
    if (settled) return;
    if (error) {
      finish({ ok: false, failure: { kind: 'dns-failed' } });
      return;
    }
    if (!addresses.length || addresses.some(entry => !isPublicAddress(entry.address))) {
      finish({ ok: false, failure: { kind: 'dns-not-public' } });
      return;
    }
    const primary = addresses[0];
    if (!primary) return;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    try {
      // HTTPS forwards these socket options even though RequestOptions does not declare autoSelectFamily.
      const requestOptions: RequestOptions & Pick<TcpSocketConnectOpts, 'autoSelectFamily'> = {
        method: 'GET',
        headers,
        signal: controller.signal,
        agent: false,
        autoSelectFamily: false,
        family: primary.family,
        servername: url.hostname,
        rejectUnauthorized: true,
        lookup: (_hostname, options, callback) => {
          if (options.all) callback(null, [{ address: primary.address, family: primary.family }]);
          else callback(null, primary.address, primary.family);
        },
      };
      req = httpsRequest(modelsUrl, requestOptions, res => {
        response = res;
        if (settled) {
          res.destroy();
          return;
        }
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          finish({ ok: false, failure: { kind: 'redirect' } });
          return;
        }
        const encoding = res.headers['content-encoding'];
        if (encoding && encoding.trim().toLowerCase() !== 'identity') {
          finish({ ok: false, failure: { kind: 'encoding' } });
          return;
        }
        if (status < 200 || status >= 300) {
          finish({ ok: false, failure: { kind: 'status', status } });
          return;
        }
        const chunks: Buffer[] = [];
        let received = 0;
        res.on('data', (chunk: Buffer) => {
          if (settled) return;
          received += chunk.length;
          if (received > MAX_UPSTREAM_BODY_BYTES) {
            finish({ ok: false, failure: { kind: 'body-too-large' } });
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => finish({ ok: true, status, body: Buffer.concat(chunks).toString('utf8') }));
        res.on('error', () => finish({ ok: false, failure: { kind: 'network' } }));
        res.on('aborted', () => finish({ ok: false, failure: { kind: 'network' } }));
      });
      req.on('error', () => finish({ ok: false, failure: { kind: 'network' } }));
      req.end();
    } catch {
      finish({ ok: false, failure: { kind: 'network' } });
    }
  });
  return promise;
}
