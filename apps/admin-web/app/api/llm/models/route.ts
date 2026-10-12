import { DEFAULT_LLM_ENDPOINT } from '@darun/utils-llm';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../requireAdmin';

const ALLOWLISTED_HOSTS = new Set(['openrouter.ai', 'api.openrouter.ai']);

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.google',
  'instance-data',
  '169.254.169.254',
  '100.100.100.200',
  'fd00:ec2::254',
  'fd00:ec2::253',
  '[fd00:ec2::254]',
  '[fd00:ec2::253]',
]);

const MAX_UPSTREAM_TIMEOUT_MS = 15_000;
const MAX_REDIRECT_HOPS = 3;

function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.+$/, '');
}

function parseIpv4ToInt(host: string): number | null {
  const parts = host.split('.');
  if (parts.length < 1 || parts.length > 4) {
    return null;
  }

  const numbers: number[] = [];
  for (const part of parts) {
    if (part.length === 0) {
      return null;
    }
    let value: number;
    if (/^0x[0-9a-f]+$/i.test(part)) {
      value = parseInt(part, 16);
    } else if (/^0[0-7]+$/.test(part)) {
      value = parseInt(part, 8);
    } else if (/^\d+$/.test(part)) {
      value = parseInt(part, 10);
    } else {
      return null;
    }
    if (!Number.isSafeInteger(value) || value < 0) {
      return null;
    }
    numbers.push(value);
  }

  const lastMax = 256 ** (5 - parts.length);
  for (let i = 0; i < numbers.length - 1; i += 1) {
    if ((numbers[i] ?? 0) > 255) {
      return null;
    }
  }
  if ((numbers[numbers.length - 1] ?? 0) >= lastMax) {
    return null;
  }

  let value = 0;
  for (let i = 0; i < numbers.length - 1; i += 1) {
    value = value * 256 + (numbers[i] ?? 0);
  }
  value = value * lastMax + (numbers[numbers.length - 1] ?? 0);
  return value;
}

function isBlockedIpLiteral(host: string): boolean {
  const bracketed = host.startsWith('[') && host.endsWith(']');
  const inner = bracketed ? host.slice(1, -1) : host;
  const lower = inner.toLowerCase();

  if (lower.includes(':')) {
    if (lower === '::1' || lower === '::') {
      return true;
    }
    if (lower.startsWith('::ffff:')) {
      return true;
    }
    if (
      lower.startsWith('fe80:') ||
      lower.startsWith('fec0:') ||
      lower.startsWith('fc00:') ||
      lower.startsWith('fd00:')
    ) {
      return true;
    }
    return false;
  }

  const value = parseIpv4ToInt(lower);
  if (value === null) {
    return false;
  }

  const first = Math.floor(value / 16_777_216);
  if (first === 0 || first === 10 || first === 127) {
    return true;
  }
  if (first === 169) {
    return Math.floor((value % 16_777_216) / 65_536) === 254;
  }
  if (first === 172) {
    const second = Math.floor((value % 16_777_216) / 65_536);
    return second >= 16 && second <= 31;
  }
  if (first === 192) {
    return Math.floor((value % 16_777_216) / 65_536) === 168;
  }
  return first >= 224;
}

function isBlockedHostname(host: string): boolean {
  if (BLOCKED_HOSTNAMES.has(host)) {
    return true;
  }
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return true;
  }
  if (host === 'metadata.google.internal' || host.endsWith('.metadata.google.internal')) {
    return true;
  }
  if (host === 'internal' || host.endsWith('.internal') || host === 'local' || host.endsWith('.local')) {
    return true;
  }
  if (host === 'example' || host.endsWith('.example') || host === 'invalid' || host.endsWith('.invalid')) {
    return true;
  }
  if (host === 'test' || host.endsWith('.test')) {
    return true;
  }
  return isBlockedIpLiteral(host);
}

function reject(message: string, status: 400 | 401 | 403): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function parseEndpoint(raw: string): { url: URL; modelsUrl: string } | { error: NextResponse } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { error: reject('유효하지 않은 엔드포인트 URL입니다.', 400) };
  }

  if (url.protocol !== 'https:') {
    return { error: reject('엔드포인트는 https:// URL이어야 합니다.', 400) };
  }
  if (url.username || url.password) {
    return { error: reject('엔드포인트 URL에 인증 정보를 포함할 수 없습니다.', 400) };
  }

  const host = normalizeHost(url.hostname);
  if (!host || isBlockedHostname(host)) {
    return { error: reject('허용되지 않은 엔드포인트입니다.', 400) };
  }

  const path = url.pathname.replace(/\/+$/, '');
  const modelsUrl = `https://${url.host}${path === '/models' || path.endsWith('/models') ? path : `${path}/models`}${url.search}`;
  return { url, modelsUrl };
}

async function fetchUpstream(
  modelsUrl: string,
  initialApiKey: string | undefined,
  initialHost: string
): Promise<Response> {
  const trimmedInitialKey = initialApiKey?.trim();
  const serverKey = process.env['OPEN_ROUTER_API_KEY']?.trim();

  // 홉별 Authorization 스코프: 서버 키는 allowlisted 홉에만 첨부하고,
  // 호출자 키는 초기 호스트와 같은 홉에만 전달하며 크로스 호스트로는
  // 절대 전달하지 않는다(allowlisted 홉이라도 초기 호스트가 다르면
  // 서버 키만 사용). 리다이렉트마다 allowlist·호스트 스코프를 재검사한다.
  const headersFor = (url: URL): Record<string, string> => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const allowlisted = isAllowlisted(url);
    const sameInitialHost = normalizeHost(url.hostname) === initialHost;
    if (allowlisted) {
      const resolved = sameInitialHost ? trimmedInitialKey || serverKey : serverKey;
      if (resolved) {
        headers['Authorization'] = `Bearer ${resolved}`;
      }
    } else if (trimmedInitialKey && sameInitialHost) {
      headers['Authorization'] = `Bearer ${trimmedInitialKey}`;
    }
    return headers;
  };

  let currentUrl = modelsUrl;
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MAX_UPSTREAM_TIMEOUT_MS);
    let response: Response;
    try {
      // URL 객체에서 호스트를 다시 구해 홉마다 스코프를 재검사한다.
      const current = new URL(currentUrl);
      response = await fetch(currentUrl, {
        method: 'GET',
        headers: headersFor(current),
        cache: 'no-store',
        redirect: 'manual',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status < 300 || response.status >= 400 || hop === MAX_REDIRECT_HOPS) {
      if (response.status >= 300 && response.status < 400) {
        await response.arrayBuffer().catch(() => undefined);
        throw new Error('리다이렉트 횟수가 초과되었습니다.');
      }
      return response;
    }

    const location = response.headers.get('location');
    await response.arrayBuffer().catch(() => undefined);
    if (!location) {
      throw new Error('리다이렉트 대상이 없습니다.');
    }
    let next: URL;
    try {
      next = new URL(location, currentUrl);
    } catch {
      throw new Error('유효하지 않은 리다이렉트 대상입니다.');
    }
    const parsed = parseEndpoint(next.toString());
    if ('error' in parsed) {
      throw new Error('허용되지 않은 리다이렉트 대상입니다.');
    }
    currentUrl = parsed.modelsUrl;
  }
  throw new Error('리다이렉트 횟수가 초과되었습니다.');
}

function isAllowlisted(url: URL): boolean {
  return ALLOWLISTED_HOSTS.has(normalizeHost(url.hostname));
}

async function handleModels(endpoint: string, apiKey?: string): Promise<NextResponse> {
  const parsed = parseEndpoint(endpoint);
  if ('error' in parsed) {
    return parsed.error;
  }

  let upstream: Response;
  try {
    upstream = await fetchUpstream(parsed.modelsUrl, apiKey, normalizeHost(parsed.url.hostname));
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    const safe = message.includes('Bearer ') ? '업스트림 요청에 실패했습니다.' : message;
    return NextResponse.json({ error: safe }, { status: 500 });
  }

  if (!upstream.ok) {
    await upstream.arrayBuffer().catch(() => undefined);
    return NextResponse.json(
      { error: `모델 목록 조회에 실패했습니다. (HTTP ${upstream.status})` },
      { status: upstream.status }
    );
  }

  const data = await upstream.json();
  return NextResponse.json(data);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!(await requireAdmin(req))) {
    return reject('관리자 인증이 필요합니다.', 401);
  }
  const url = new URL(req.url);
  if (url.searchParams.has('apiKey')) {
    return reject('apiKey는 쿼리로 전달할 수 없습니다.', 400);
  }
  const endpoint =
    url.searchParams.get('endpoint')?.trim() || process.env['OPEN_ROUTER_ENDPOINT']?.trim() || DEFAULT_LLM_ENDPOINT;
  return handleModels(endpoint);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await requireAdmin(req))) {
    return reject('관리자 인증이 필요합니다.', 401);
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const rawEndpoint = typeof body['endpoint'] === 'string' ? body['endpoint'] : '';
  const endpoint = rawEndpoint.trim() || process.env['OPEN_ROUTER_ENDPOINT']?.trim() || DEFAULT_LLM_ENDPOINT;
  const apiKey = typeof body['apiKey'] === 'string' ? body['apiKey'] : undefined;
  return handleModels(endpoint, apiKey);
}
