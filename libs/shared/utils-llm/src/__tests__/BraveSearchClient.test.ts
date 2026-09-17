import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BraveSearchClient } from '../search/BraveSearchClient';
import { BraveWebSearchMcpTool } from '../search/BraveWebSearchMcpTool';

describe('BraveSearchClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('API 키가 없으면 검색을 건너뛰고 빈 배열을 반환한다', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    const client = new BraveSearchClient(() => undefined);

    const results = await client.search('Cursor');

    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('비동기 apiKeyProvider 로부터 API 키를 성공적으로 가져와 사용한다', async () => {
    const mockApiResponse = {
      web: {
        results: [
          {
            title: 'Async Test',
            url: 'https://example.com/async',
            description: 'Async test description',
          },
        ],
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockApiResponse,
    });
    globalThis.fetch = fetchMock;

    const asyncKeyProvider = vi.fn().mockResolvedValue('async-brave-token');
    const client = new BraveSearchClient(asyncKeyProvider);

    const results = await client.search('async query');

    expect(asyncKeyProvider).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['X-Subscription-Token']).toBe('async-brave-token');
    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('Async Test');
  });

  it('빈 검색어인 경우 검색을 수행하지 않고 빈 배열을 반환한다', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    const client = new BraveSearchClient(() => 'test-key');
    const results = await client.search('   ');

    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('성공적인 검색 응답을 WebSearchResult 배열로 변환한다', async () => {
    const mockApiResponse = {
      web: {
        results: [
          {
            title: 'Cursor - The AI Code Editor',
            url: 'https://www.cursor.com',
            description: 'Cursor is a code editor built for programming with AI.',
            extra_snippets: ['Feature 1', 'Feature 2'],
          },
          {
            title: 'Incomplete Item',
            url: '',
            description: 'No url',
          },
        ],
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockApiResponse,
    });
    globalThis.fetch = fetchMock;

    const client = new BraveSearchClient(() => 'test-brave-key');
    const results = await client.search('Cursor AI', { count: 3 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(calledUrl.origin).toBe('https://api.search.brave.com');
    expect(calledUrl.searchParams.get('q')).toBe('Cursor AI');
    expect(calledUrl.searchParams.get('count')).toBe('3');

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['X-Subscription-Token']).toBe('test-brave-key');

    expect(results).toEqual([
      {
        title: 'Cursor - The AI Code Editor',
        url: 'https://www.cursor.com',
        description: 'Cursor is a code editor built for programming with AI.',
        extraSnippets: ['Feature 1', 'Feature 2'],
      },
    ]);
  });

  it('HTTP 오류 응답(429, 500 등) 시 에러를 던지지 않고 빈 배열을 반환한다', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });
    globalThis.fetch = fetchMock;

    const client = new BraveSearchClient(() => 'test-key');
    const results = await client.search('test query');

    expect(results).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Web search request failed with status 429'));
  });

  it('네트워크 오류 또는 타임아웃 발생 시 에러를 던지지 않고 빈 배열을 반환한다', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network connection aborted'));
    globalThis.fetch = fetchMock;

    const client = new BraveSearchClient(() => 'test-key');
    const results = await client.search('test query');

    expect(results).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Error occurred during web search'));
  });
});

describe('BraveWebSearchMcpTool', () => {
  it('MCP 인터페이스 스펙을 준수하며 search를 올바르게 위임한다', async () => {
    const mockClient = {
      search: vi.fn().mockResolvedValue([
        {
          title: 'Result 1',
          url: 'https://example.com',
          description: 'Example description',
        },
      ]),
    } as unknown as BraveSearchClient;

    const tool = new BraveWebSearchMcpTool(mockClient);

    expect(tool.name).toBe('brave_web_search');
    expect(tool.inputSchema.properties).toHaveProperty('query');

    const result = await tool.execute({ query: 'Figma', count: 2 });

    expect(mockClient.search).toHaveBeenCalledWith('Figma', { count: 2 });
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Result 1');
  });
});
