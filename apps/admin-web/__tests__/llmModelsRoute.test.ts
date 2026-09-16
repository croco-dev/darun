import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../app/api/llm/models/route';

describe('app/api/llm/models/route', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('GET: fetches models from endpoint and returns JSON', async () => {
    const mockModels = {
      data: [{ id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' }],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockModels,
    });

    const req = new NextRequest('http://localhost:3001/api/llm/models?endpoint=https://openrouter.ai/api/v1');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(mockModels);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/models',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Accept: 'application/json' }),
      })
    );
  });

  it('POST: accepts endpoint and apiKey in body', async () => {
    const mockModels = {
      data: [{ id: 'x-ai/grok-4-fast', name: 'Grok 4 Fast' }],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockModels,
    });

    const req = new NextRequest('http://localhost:3001/api/llm/models', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: 'https://custom-api.example.com/v1',
        apiKey: 'sk-test-key-1234',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(mockModels);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://custom-api.example.com/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test-key-1234',
        }),
      })
    );
  });

  it('POST: returns error status and message when upstream fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized API Key',
    });

    const req = new NextRequest('http://localhost:3001/api/llm/models', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: 'https://openrouter.ai/api/v1',
        apiKey: 'invalid',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('모델 목록 조회에 실패했습니다');
  });
});
