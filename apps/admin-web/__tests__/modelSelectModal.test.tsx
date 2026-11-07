// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ModelSelectModal,
  type ModelSelectModalProps,
} from '../features/settings/LlmSettingFormSection/ModelSelectModal';

function deferModelRequests() {
  const requests: {
    options?: RequestInit;
    resolve: (response: Response) => void;
    reject: (error: Error) => void;
  }[] = [];
  global.fetch = vi.fn(
    (_url, options) =>
      new Promise<Response>((resolve, reject) => {
        // Deliberately allow responses after abort: cancellation alone cannot prove ownership.
        requests.push({ options, resolve, reject });
      })
  );
  return requests;
}

function modelResponse(id: string) {
  return new Response(JSON.stringify({ data: [{ id }] }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function modal(props: Partial<ModelSelectModalProps> = {}) {
  return (
    <ModelSelectModal
      opened={true}
      endpoint="https://provider-a.example/v1"
      selectedModel=""
      onClose={vi.fn()}
      onSelectModel={vi.fn()}
      {...props}
    />
  );
}

describe('ModelSelectModal', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  it('renders null when opened is false', () => {
    const { container } = render(
      <ModelSelectModal
        opened={false}
        onClose={vi.fn()}
        endpoint="https://openrouter.ai/api/v1"
        selectedModel="nvidia/nemotron-3-super-120b-a12b:free"
        onSelectModel={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it.each(['success', 'failure'] as const)('ignores provider A late %s after provider B has loaded', async outcome => {
    const requests = deferModelRequests();
    const onSelectModel = vi.fn();
    const { rerender } = render(modal());
    await act(() => vi.runOnlyPendingTimersAsync());
    rerender(modal({ opened: false }));
    rerender(modal({ endpoint: 'https://provider-b.example/v1', onSelectModel }));
    await act(() => vi.runOnlyPendingTimersAsync());
    expect(requests).toHaveLength(2);
    await act(async () => requests[1].resolve(modelResponse('provider-b/current')));
    expect(screen.getByRole('button', { name: /provider-b\/current/ })).toBeDefined();

    await act(async () => {
      if (outcome === 'success') requests[0].resolve(modelResponse('provider-a/stale'));
      else requests[0].reject(new Error('provider A failed late'));
    });
    expect(screen.queryByRole('button', { name: /provider-a\/stale/ })).toBeNull();
    expect(screen.queryByText('provider A failed late')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /provider-b\/current/ }));
    expect(onSelectModel).toHaveBeenCalledExactlyOnceWith('provider-b/current');
    expect(requests[0].options?.signal?.aborted).toBe(true);
  });

  it.each(['success', 'failure'] as const)(
    'keeps the new request loading when an old request ends with %s',
    async outcome => {
      const requests = deferModelRequests();
      const { rerender } = render(modal());
      await act(() => vi.runOnlyPendingTimersAsync());
      rerender(modal({ endpoint: 'https://provider-b.example/v1' }));
      await act(() => vi.runOnlyPendingTimersAsync());
      await act(async () => {
        if (outcome === 'success') requests[0].resolve(modelResponse('provider-a/stale'));
        else requests[0].reject(new Error('provider A failed late'));
      });
      expect(screen.getByText('모델 목록을 불러오는 중...')).toBeDefined();
      expect(screen.getByRole('button', { name: '새로고침' }).hasAttribute('disabled')).toBe(true);
      expect(screen.queryByRole('button', { name: /provider-a\/stale/ })).toBeNull();
      expect(screen.queryByText('provider A failed late')).toBeNull();
      await act(async () => requests[1].resolve(modelResponse('provider-b/current')));
      expect(screen.getByRole('button', { name: /provider-b\/current/ })).toBeDefined();
    }
  );

  it('reopens an unfinished request with a fresh request and ignores the closed session response', async () => {
    const requests = deferModelRequests();
    const { rerender } = render(modal());
    await act(() => vi.runOnlyPendingTimersAsync());
    rerender(modal({ opened: false }));
    await act(async () => requests[0].resolve(modelResponse('closed-session/stale')));
    rerender(modal());
    await act(() => vi.runOnlyPendingTimersAsync());
    expect(requests).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /closed-session\/stale/ })).toBeNull();
    await act(async () => requests[1].resolve(modelResponse('reopened/current')));
    expect(screen.getByRole('button', { name: /reopened\/current/ })).toBeDefined();
    rerender(modal({ opened: false }));
    rerender(modal());
    await act(() => vi.runOnlyPendingTimersAsync());
    expect(requests).toHaveLength(2);
    expect(screen.getByRole('button', { name: /reopened\/current/ })).toBeDefined();
  });

  it('hides the old provider models immediately and retries a failed new provider on reopen', async () => {
    const requests = deferModelRequests();
    const { rerender } = render(modal());
    await act(() => vi.runOnlyPendingTimersAsync());
    await act(async () => requests[0].resolve(modelResponse('provider-a/loaded')));
    rerender(modal({ endpoint: 'https://provider-b.example/v1' }));
    expect(screen.queryByRole('button', { name: /provider-a\/loaded/ })).toBeNull();
    await act(() => vi.runOnlyPendingTimersAsync());
    await act(async () => requests[1].reject(new Error('provider B unavailable')));
    expect(screen.getByText('provider B unavailable')).toBeDefined();
    rerender(modal({ opened: false, endpoint: 'https://provider-b.example/v1' }));
    rerender(modal({ endpoint: 'https://provider-b.example/v1' }));
    await act(() => vi.runOnlyPendingTimersAsync());
    expect(requests).toHaveLength(3);
    await act(async () => requests[2].resolve(modelResponse('provider-b/recovered')));
    expect(screen.getByRole('button', { name: /provider-b\/recovered/ })).toBeDefined();
  });

  it('treats a changed API key as a new model request at the same endpoint', async () => {
    const requests = deferModelRequests();
    const { rerender } = render(modal({ apiKey: 'fixture-key-a' }));
    await act(() => vi.runOnlyPendingTimersAsync());
    rerender(modal({ apiKey: 'fixture-key-b' }));
    await act(() => vi.runOnlyPendingTimersAsync());
    expect(JSON.parse(String(requests[1].options?.body)).apiKey).toBe('fixture-key-b');
    await act(async () => requests[1].resolve(modelResponse('new-key/current')));
    await act(async () => requests[0].resolve(modelResponse('old-key/stale')));
    expect(screen.getByRole('button', { name: /new-key\/current/ })).toBeDefined();
    expect(screen.queryByRole('button', { name: /old-key\/stale/ })).toBeNull();
  });

  it('keeps the latest manual refresh when two refreshes start before the pending render', async () => {
    const requests = deferModelRequests();
    render(modal());
    await act(() => vi.runOnlyPendingTimersAsync());
    await act(async () => requests[0].resolve(modelResponse('initial/loaded')));
    const refresh = screen.getByRole('button', { name: '새로고침' });
    act(() => {
      refresh.click();
      refresh.click();
    });
    expect(requests).toHaveLength(3);
    await act(async () => requests[2].resolve(modelResponse('refresh/current')));
    await act(async () => requests[1].resolve(modelResponse('refresh/stale')));
    expect(screen.getByRole('button', { name: /refresh\/current/ })).toBeDefined();
    expect(screen.queryByRole('button', { name: /refresh\/stale/ })).toBeNull();
  });

  it('fetches models when opened and renders list, then selects on click', async () => {
    const mockModels = {
      data: [
        {
          id: 'google/gemini-2.5-flash',
          name: 'Google Gemini 2.5 Flash',
          description: 'High-speed multimodal model',
          context_length: 1000000,
        },
        {
          id: 'x-ai/grok-4-fast',
          name: 'xAI Grok 4 Fast',
          description: 'Fast reasoning model',
          context_length: 131072,
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockModels,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const onSelectModel = vi.fn();
    const onClose = vi.fn();

    render(
      <ModelSelectModal
        opened={true}
        onClose={onClose}
        endpoint="https://openrouter.ai/api/v1"
        selectedModel="x-ai/grok-4-fast"
        onSelectModel={onSelectModel}
      />
    );

    await act(() => vi.runOnlyPendingTimersAsync());
    expect(screen.getByRole('button', { name: /google\/gemini-2.5-flash/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /x-ai\/grok-4-fast/ })).toBeDefined();
    // 브라우저 직접 fetch fallback 없이 서버 프록시만 호출한다.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe('/api/llm/models');
    expect(new URL(calledUrl, 'http://localhost:3001').host).toBe('localhost:3001');
    expect(String(calledOptions.method)).toBe('POST');
    expect(String(new Headers(calledOptions.headers).get('content-type'))).toBe('application/json');

    // Test search filter
    const searchInput = screen.getByPlaceholderText(/모델명 또는 모델 ID 검색/i);
    fireEvent.change(searchInput, { target: { value: 'gemini' } });

    expect(screen.getByRole('button', { name: /google\/gemini-2.5-flash/ })).toBeDefined();
    expect(screen.queryByRole('button', { name: /x-ai\/grok-4-fast/ })).toBeNull();

    // Click on model item
    fireEvent.click(screen.getByRole('button', { name: /google\/gemini-2.5-flash/ }));

    expect(onSelectModel).toHaveBeenCalledWith('google/gemini-2.5-flash');
    expect(onClose).toHaveBeenCalled();
  });

  it('서버 프록시 오류 응답의 error 메시지를 그대로 표시하고 외부 URL을 호출하지 않는다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: '커스텀 엔드포인트에는 기본 환경 키(OPEN_ROUTER_API_KEY)를 사용할 수 없습니다.',
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <ModelSelectModal
        opened={true}
        onClose={vi.fn()}
        endpoint="https://custom-api.example.com/v1"
        apiKey="sk-env-default"
        selectedModel=""
        onSelectModel={vi.fn()}
      />
    );

    await act(() => vi.runOnlyPendingTimersAsync());
    expect(screen.getByText('모델 목록 조회 실패')).toBeDefined();
    expect(
      screen.getByText(/커스텀 엔드포인트에는 기본 환경 키\(OPEN_ROUTER_API_KEY\)를 사용할 수 없습니다\./)
    ).toBeDefined();

    // 실패 시에도 서버 프록시 외부 호출은 없다.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toBe('/api/llm/models');
  });

  it('shows capability status and filters only models supporting both required parameters', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'vendor/supported',
            supported_parameters: ['structured_outputs', 'response_format'],
          },
          { id: 'vendor/json-only', supported_parameters: ['response_format'] },
          {
            id: 'vendor/schema-only',
            supported_parameters: ['structured_outputs'],
          },
          { id: 'vendor/unsupported', supported_parameters: [] },
          { id: 'vendor/unknown' },
        ],
      }),
    });

    render(
      <ModelSelectModal
        opened={true}
        onClose={vi.fn()}
        endpoint="https://openrouter.ai/api/v1"
        selectedModel=""
        onSelectModel={vi.fn()}
      />
    );

    await act(() => vi.runOnlyPendingTimersAsync());
    const supported = screen.getByRole('button', {
      name: /vendor\/supported/,
    });
    expect(within(supported).getByText('구조화 응답 지원')).toBeDefined();
    for (const id of ['json-only', 'schema-only', 'unsupported']) {
      const item = screen.getByRole('button', {
        name: new RegExp(`vendor/${id}`),
      });
      expect(within(item).getByText('구조화 응답 미지원')).toBeDefined();
      expect(
        within(item).getByText('서비스 소개 자동 작성·검수에 필요한 구조화 응답을 지원하지 않습니다.')
      ).toBeDefined();
    }
    const unknown = screen.getByRole('button', { name: /vendor\/unknown/ });
    expect(within(unknown).getByText('구조화 응답 지원 여부 미확인')).toBeDefined();
    expect(
      within(unknown).getByText('지원 정보가 없어 서비스 소개 자동 작성·검수에 사용할 수 있는지 확인이 필요합니다.')
    ).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: '구조화 응답 지원' }));
    expect(screen.getByRole('button', { name: /vendor\/supported/ })).toBeDefined();
    for (const id of ['json-only', 'schema-only', 'unsupported', 'unknown']) {
      expect(screen.queryByRole('button', { name: new RegExp(`vendor/${id}`) })).toBeNull();
    }
    fireEvent.change(screen.getByRole('textbox', { name: '모델 검색' }), {
      target: { value: 'unknown' },
    });
    expect(screen.getByText('검색 조건과 일치하는 모델이 없습니다.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: '검색 및 필터 초기화' }));
    expect(screen.getByRole('button', { name: /vendor\/unknown/ })).toBeDefined();
  });

  it.each([
    ['unsupported', []],
    ['absent', undefined],
    ['null', null],
    ['string', 'structured_outputs,response_format'],
    ['object', { structured_outputs: true, response_format: true }],
    ['mixed-array', ['structured_outputs', 'response_format', 1]],
  ])('keeps %s capability models selectable and handles malformed metadata as unknown', async (id, metadata) => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: `vendor/${id}`, supported_parameters: metadata }],
      }),
    });
    const onSelectModel = vi.fn();
    const onClose = vi.fn();
    render(
      <ModelSelectModal
        opened={true}
        onClose={onClose}
        endpoint="https://openrouter.ai/api/v1"
        selectedModel=""
        onSelectModel={onSelectModel}
      />
    );
    await act(() => vi.runOnlyPendingTimersAsync());
    const item = screen.getByRole('button', {
      name: new RegExp(`vendor/${id}`),
    });
    expect(
      within(item).getByText(id === 'unsupported' ? '구조화 응답 미지원' : '구조화 응답 지원 여부 미확인')
    ).toBeDefined();
    fireEvent.click(item);
    expect(onSelectModel).toHaveBeenCalledWith(`vendor/${id}`);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
