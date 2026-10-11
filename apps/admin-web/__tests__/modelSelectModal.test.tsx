// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelSelectModal } from '../features/settings/LlmSettingFormSection/ModelSelectModal';

describe('ModelSelectModal', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
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

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockModels,
    });

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

    // Wait for models to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /google\/gemini-2.5-flash/ })).toBeDefined();
      expect(screen.getByRole('button', { name: /x-ai\/grok-4-fast/ })).toBeDefined();
    });

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

    const supported = await screen.findByRole('button', {
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
    const item = await screen.findByRole('button', {
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
