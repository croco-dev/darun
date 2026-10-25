import { afterEach, describe, expect, it, vi } from 'vitest';
import { getEventListeners } from 'node:events';
import { BraveSearchClient } from '../search/BraveSearchClient';

const LIMIT = 2 * 1024 * 1024;
const encoder = new TextEncoder();

describe('Brave 응답 본문의 크기와 수명', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it.each([undefined, '1', 'invalid'])('길이 헤더 %s와 무관하게 실제 수신 byte 초과를 거절한다', async length => {
    const cancel = vi.fn();
    let pulls = 0;
    const chunk = encoder.encode('가'.repeat(256 * 1024));
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          pulls += 1;
          controller.enqueue(chunk);
          if (pulls === 5) controller.close();
        },
        cancel,
      },
      { highWaterMark: 0 }
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(body, {
          headers: length === undefined ? {} : { 'Content-Length': length },
        })
      )
    );

    expect(await new BraveSearchClient(() => 'synthetic-key').search('linear')).toEqual({
      ok: false,
      code: 'UPSTREAM_ERROR',
      message: 'Brave search response exceeds 2097152 bytes',
    });
    expect(pulls).toBe(3);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('초과 Content-Length는 본문을 읽기 전에 거절하고 해제한다', async () => {
    const cancel = vi.fn();
    const pull = vi.fn();
    const body = new ReadableStream<Uint8Array>({ pull, cancel }, { highWaterMark: 0 });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(body, {
          headers: { 'Content-Length': String(LIMIT + 1) },
        })
      )
    );
    pull.mockImplementation(controller => {
      controller.enqueue(encoder.encode('{}'));
      controller.close();
    });
    expect(await new BraveSearchClient(() => 'synthetic-key').search('linear')).toMatchObject({
      ok: false,
      code: 'UPSTREAM_ERROR',
      message: 'Brave search response exceeds 2097152 bytes',
    });
    expect(pull).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it.each([LIMIT - 1, LIMIT])('%i byte의 정상 JSON과 chunk 사이에 나뉜 UTF-8 문자를 보존한다', async size => {
    const json = JSON.stringify({
      web: {
        results: [
          {
            title: '가나다',
            url: 'https://example.com',
            description: '설명',
          },
        ],
      },
    });
    const bytes = encoder.encode(json + ' '.repeat(size - encoder.encode(json).byteLength));
    const split = encoder.encode(json.slice(0, json.indexOf('가'))).byteLength + 1;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, split));
        controller.enqueue(bytes.slice(split));
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
    expect(await new BraveSearchClient(() => 'synthetic-key').search('linear')).toEqual({
      ok: true,
      results: [
        {
          title: '가나다',
          url: 'https://example.com',
          description: '설명',
          extraSnippets: [],
        },
      ],
    });
  });

  it.each([429, 500])('%i의 끝나지 않는 본문을 해제하고 timer와 부모 listener를 제거한다', async status => {
    vi.useFakeTimers();
    const parent = new AbortController();
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ cancel });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status })));
    expect(await new BraveSearchClient(() => 'synthetic-key').search('linear', 5, parent.signal)).toMatchObject({
      ok: false,
      code: status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR',
    });
    expect(cancel).toHaveBeenCalledOnce();
    expect(getEventListeners(parent.signal, 'abort')).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('취소가 실패해도 upstream status를 유지한다', async () => {
    const body = new ReadableStream({
      cancel: () => Promise.reject(new Error('cancel failed')),
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 429 })));
    expect(await new BraveSearchClient(() => 'synthetic-key').search('linear')).toMatchObject({
      ok: false,
      code: 'RATE_LIMITED',
    });
  });
});
