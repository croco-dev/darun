import { DEFAULT_LLM_ENDPOINT, LLM_DEFAULT_KEY_REJECTION_MESSAGE, resolveLlmEndpointKey } from '@darun/utils-llm';
import { NextRequest, NextResponse } from 'next/server';
import { container } from '../../../container';
import { fetchModelsFromPinnedEndpoint, parseModelEndpoint, type UpstreamFetchFailure } from './fetchModels';

export const runtime = 'nodejs';
const MAX_REQUEST_BODY_BYTES = 16 * 1024;

async function authenticate(
  req: NextRequest,
  cookies: NextResponse
): Promise<'admin' | 'unauthenticated' | 'forbidden'> {
  try {
    const service = container.createAuthService();
    // Match AuthChecker's request-local storage and refresh-cookie convention.
    service.setAuthStorage({
      get: key => req.cookies.get(key)?.value ?? null,
      set: values => {
        for (const key of Object.keys(values) as (keyof typeof values)[]) {
          const value = values[key];
          if (value) {
            cookies.cookies.set(key, value, {
              sameSite: 'strict',
              expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            });
          } else cookies.cookies.delete(key);
        }
      },
      clear: () => {},
    });
    const user = await service.getUser();
    if (!user) return 'unauthenticated';
    return user.isAdmin ? 'admin' : 'forbidden';
  } catch {
    return 'unauthenticated';
  }
}

function withAuthCookies(target: NextResponse, cookies: NextResponse): NextResponse {
  for (const cookie of cookies.cookies.getAll()) target.cookies.set(cookie);
  return target;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cookies = new NextResponse();
  const auth = await authenticate(req, cookies);
  const response =
    auth === 'admin'
      ? NextResponse.json({ error: '모델 조회는 POST만 지원합니다.' }, { status: 405, headers: { Allow: 'POST' } })
      : NextResponse.json(
          { error: auth === 'forbidden' ? '관리자 권한이 필요합니다.' : '인증이 필요합니다.' },
          { status: auth === 'forbidden' ? 403 : 401 }
        );
  return withAuthCookies(response, cookies);
}

function upstreamError(failure: UpstreamFetchFailure): NextResponse {
  if (failure.kind === 'timeout')
    return NextResponse.json({ error: '모델 목록 조회가 시간 초과되었습니다.' }, { status: 504 });
  if (failure.kind === 'dns-not-public')
    return NextResponse.json({ error: '내부 주소로 해석되는 엔드포인트는 사용할 수 없습니다.' }, { status: 400 });
  return NextResponse.json({ error: '모델 공급자의 목록을 조회하지 못했습니다.' }, { status: 502 });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const cookies = new NextResponse();
  const auth = await authenticate(req, cookies);
  if (auth !== 'admin') {
    return withAuthCookies(
      NextResponse.json(
        { error: auth === 'forbidden' ? '관리자 권한이 필요합니다.' : '인증이 필요합니다.' },
        { status: auth === 'forbidden' ? 403 : 401 }
      ),
      cookies
    );
  }

  let body: unknown;
  try {
    const reader = req.body?.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    if (reader) {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
          if (received > MAX_REQUEST_BODY_BYTES) {
            await reader.cancel();
            return withAuthCookies(NextResponse.json({ error: '요청 본문이 너무 큽니다.' }, { status: 400 }), cookies);
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return withAuthCookies(NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 }), cookies);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return withAuthCookies(NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 }), cookies);
  }
  const endpoint = 'endpoint' in body ? body.endpoint : undefined;
  const apiKey = 'apiKey' in body ? body.apiKey : undefined;
  if (
    (endpoint !== undefined && typeof endpoint !== 'string') ||
    (apiKey !== undefined && typeof apiKey !== 'string')
  ) {
    return withAuthCookies(NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 }), cookies);
  }
  const parsed = parseModelEndpoint(endpoint?.trim() || process.env['OPEN_ROUTER_ENDPOINT'] || DEFAULT_LLM_ENDPOINT);
  if (!parsed) {
    return withAuthCookies(
      NextResponse.json(
        {
          error:
            'HTTPS 공개 호스트의 기본 포트 URL만 사용할 수 있습니다. 자격증명·쿼리·프래그먼트는 포함할 수 없습니다.',
        },
        { status: 400 }
      ),
      cookies
    );
  }
  const key = resolveLlmEndpointKey({
    endpoint: parsed.baseUrl,
    explicitApiKey: apiKey,
    envApiKey: process.env['OPEN_ROUTER_API_KEY'],
  });
  if (!key.allowed)
    return withAuthCookies(NextResponse.json({ error: LLM_DEFAULT_KEY_REJECTION_MESSAGE }, { status: 400 }), cookies);

  try {
    const result = await fetchModelsFromPinnedEndpoint(parsed.modelsUrl, key.apiKey);
    if (!result.ok) return withAuthCookies(upstreamError(result.failure), cookies);
    const data: unknown = JSON.parse(result.body);
    if (!Array.isArray(data) && (!data || typeof data !== 'object' || !('data' in data) || !Array.isArray(data.data))) {
      return withAuthCookies(
        NextResponse.json({ error: '모델 목록 응답 형식이 올바르지 않습니다.' }, { status: 502 }),
        cookies
      );
    }
    return withAuthCookies(NextResponse.json(data), cookies);
  } catch {
    return withAuthCookies(NextResponse.json({ error: '모델 목록 조회에 실패했습니다.' }, { status: 502 }), cookies);
  }
}
