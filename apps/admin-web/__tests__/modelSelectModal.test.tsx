// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelSelectModal } from '../features/settings/LlmSettingFormSection/ModelSelectModal';

describe('ModelSelectModal', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (typeof window !== 'undefined') {
      window.fetch = originalFetch;
    }
  });

  it('renders null when opened is false', () => {
    const { container } = render(
      <ModelSelectModal
        opened={false}
        onClose={vi.fn()}
        endpoint="https://openrouter.ai/api/v1"
        selectedModel="nvidia/nemotron-3-ultra-550b-a55b:free"
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

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockModels,
    });
    globalThis.fetch = fetchMock;
    window.fetch = fetchMock;

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
});
