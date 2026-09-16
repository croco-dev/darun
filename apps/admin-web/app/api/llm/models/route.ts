import { NextRequest, NextResponse } from 'next/server';

async function fetchModelsFromEndpoint(endpoint: string, apiKey?: string | null): Promise<Response> {
  const normalizedEndpoint = endpoint.trim().replace(/\/+$/, '');
  const modelsUrl = normalizedEndpoint.endsWith('/models') ? normalizedEndpoint : `${normalizedEndpoint}/models`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const resolvedApiKey = apiKey?.trim() || process.env['OPEN_ROUTER_API_KEY'];
  if (resolvedApiKey) {
    headers['Authorization'] = `Bearer ${resolvedApiKey}`;
  }

  return fetch(modelsUrl, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(req.url);
    const endpoint =
      url.searchParams.get('endpoint') || process.env['OPEN_ROUTER_ENDPOINT'] || 'https://openrouter.ai/api/v1';
    const apiKey = url.searchParams.get('apiKey');

    const response = await fetchModelsFromEndpoint(endpoint, apiKey);
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `모델 목록 조회에 실패했습니다. (HTTP ${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEndpoint = typeof body.endpoint === 'string' ? body.endpoint : '';
    const endpoint = rawEndpoint.trim() || process.env['OPEN_ROUTER_ENDPOINT'] || 'https://openrouter.ai/api/v1';
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey : undefined;

    const response = await fetchModelsFromEndpoint(endpoint, apiKey);
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `모델 목록 조회에 실패했습니다. (HTTP ${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
