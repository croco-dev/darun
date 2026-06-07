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

  it('track should call posthog.capture after initialization', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-ph-key');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://test.example.com');

    const { initPostHog, track } = await import('../posthog');
    initPostHog();
    track('test_event', { foo: 'bar' });

    expect(mockCapture).toHaveBeenCalledWith('test_event', { foo: 'bar' });
  });

  it('track should be no-op when init env vars are missing', async () => {
    const { initPostHog, track } = await import('../posthog');
    initPostHog();
    track('another_event');

    expect(mockCapture).not.toHaveBeenCalled();
  });
});
