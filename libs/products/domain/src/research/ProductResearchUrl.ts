const MAX_OFFICIAL_URL_CHARS = 255;

function hasCredentials(parsed: URL): boolean {
  return parsed.username.length > 0 || parsed.password.length > 0;
}

function isLoopbackHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === 'localhost') {
    return true;
  }
  if (lower === '127.0.0.1' || lower === '::1' || lower === '[::1]') {
    return true;
  }
  if (lower.startsWith('127.') || lower.startsWith('10.') || lower.startsWith('192.168.')) {
    return true;
  }
  const parts = lower.split('.').map(Number);
  if (parts.length === 4 && parts.every(part => Number.isInteger(part) && part >= 0 && part <= 255)) {
    const [first, second] = parts;
    if (first === 172 && second !== undefined && second >= 16 && second <= 31) {
      return true;
    }
    if (first === 169 && second === 254) {
      return true;
    }
  }
  return lower.endsWith('.localhost') || lower.endsWith('.local') || lower.endsWith('.internal');
}

function isSecretPath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  if (lower.includes('/invite/') || lower.includes('/reset-password/') || lower.includes('/callback/')) {
    return true;
  }
  return lower.split('/').some(segment => segment.length >= 32 && /^[a-z0-9_-]+$/i.test(segment));
}

export type NormalizeOfficialUrlSuccess = { ok: true; url: string; hostname: string };
export type NormalizeOfficialUrlFailure = { ok: false; reason: string };
export type NormalizeOfficialUrlResult = NormalizeOfficialUrlSuccess | NormalizeOfficialUrlFailure;

function withScheme(input: string): string {
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(input)) {
    return input;
  }
  return `https://${input}`;
}

export function normalizeOfficialUrl(input: string): NormalizeOfficialUrlResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: '공식 사이트 URL을 입력하세요.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(withScheme(trimmed));
  } catch {
    return { ok: false, reason: '유효한 http(s) URL을 입력하세요.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'http 또는 https URL만 사용할 수 있습니다.' };
  }
  if (hasCredentials(parsed)) {
    return { ok: false, reason: '계정 정보가 포함된 URL은 사용할 수 없습니다.' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname.length === 0 || isLoopbackHostname(hostname)) {
    return { ok: false, reason: '로컬 또는 내부 주소는 사용할 수 없습니다.' };
  }
  if (isSecretPath(parsed.pathname)) {
    return { ok: false, reason: '일회성 또는 비밀 경로가 포함된 URL은 사용할 수 없습니다. 공개 홈 URL을 입력하세요.' };
  }

  parsed.hostname = hostname;
  parsed.hash = '';
  parsed.search = '';
  if (
    (parsed.protocol === 'http:' && parsed.port === '80') ||
    (parsed.protocol === 'https:' && parsed.port === '443')
  ) {
    parsed.port = '';
  }
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  const normalized = parsed.toString();
  if (normalized.length > MAX_OFFICIAL_URL_CHARS) {
    return { ok: false, reason: '공식 URL이 너무 깁니다. 짧은 공식 URL을 입력하세요.' };
  }

  return { ok: true, url: normalized, hostname };
}

export function suggestSlug(name: string, hostname: string): string {
  const fromName = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{ASCII}]/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fromName)) {
    return fromName;
  }
  const hostLabel = hostname.split('.')[0] ?? '';
  const fallback = hostLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fallback) ? fallback : 'service';
}

export function isSafeSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
