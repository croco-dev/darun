import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInit = vi.fn();
const mockCapture = vi.fn();

vi.mock('posthog-js', () => ({
  default: {
    init: mockInit,
    capture: mockCapture,
  },
}));

describe('posthog', () => {
  beforeEach(() => {
    vi.resetModules();
    mockInit.mockClear();
    mockCapture.mockClear();
    vi.unstubAllEnvs();
  });

  it('track should be no-op with no runtime error when posthog is not initialized', async () => {
    const { track } = await import('../posthog');
    expect(() => track('some_event', { key: 'value' })).not.toThrow();
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('initPostHog should not call posthog.init when env vars are missing', async () => {
    const { initPostHog } = await import('../posthog');
    initPostHog();
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('initPostHog should call posthog.init with key and host when env vars are set', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-ph-key');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://test.example.com');

    const { initPostHog } = await import('../posthog');
    initPostHog();

    expect(mockInit).toHaveBeenCalledWith(
      'test-ph-key',
      expect.objectContaining({ api_host: 'https://test.example.com' })
    );
  });

  it('track should capture after loaded callback marks readiness', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-ph-key');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://test.example.com');

    const { initPostHog, track } = await import('../posthog');
    initPostHog();

    track('before_loaded', { phase: 'before' });
    expect(mockCapture).not.toHaveBeenCalled();

    const loadedCallback = mockInit.mock.calls[0][1].loaded;
    loadedCallback();

    track('after_loaded', { phase: 'after' });
    expect(mockCapture).toHaveBeenCalledWith('after_loaded', { phase: 'after' });
  });

  it('track should be no-op when init env vars are missing', async () => {
    const { initPostHog, track } = await import('../posthog');
    initPostHog();
    track('another_event');

    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('initPostHog should only call posthog.init once on repeated calls', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-ph-key');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://test.example.com');

    const { initPostHog } = await import('../posthog');
    initPostHog();
    initPostHog();
    initPostHog();

    expect(mockInit).toHaveBeenCalledTimes(1);
  });

  it('isPostHogReady should reflect loaded state', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-ph-key');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://test.example.com');

    const { initPostHog, isPostHogReady } = await import('../posthog');

    expect(isPostHogReady()).toBe(false);

    initPostHog();
    expect(isPostHogReady()).toBe(false);

    const loadedCallback = mockInit.mock.calls[0][1].loaded;
    loadedCallback();
    expect(isPostHogReady()).toBe(true);
  });
});
