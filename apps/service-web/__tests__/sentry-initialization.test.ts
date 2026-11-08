import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { init, replayIntegration, captureRequestError } = vi.hoisted(() => ({
  init: vi.fn(),
  replayIntegration: vi.fn(() => ({ name: 'Replay' })),
  captureRequestError: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({ init, replayIntegration, captureRequestError }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => vi.unstubAllEnvs());

describe('Sentry initialization entrypoints', () => {
  it('initializes the browser once with the existing sampling and replay policy', async () => {
    await import('../instrumentation-client');
    await import('../instrumentation-client');

    expect(init).toHaveBeenCalledExactlyOnceWith({
      dsn: 'https://14122c7a96c0bbf2326ceea19d0c9bcd@o1088571.ingest.us.sentry.io/4508023095361536',
      integrations: [{ name: 'Replay' }],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      debug: false,
    });
    expect(replayIntegration).toHaveBeenCalledOnce();
  });

  it.each(['nodejs', 'edge'])('keeps %s request instrumentation separate from browser replay', async runtime => {
    vi.stubEnv('NEXT_RUNTIME', runtime);
    const { register, onRequestError } = await import('../instrumentation');
    await register();

    expect(init).toHaveBeenCalledExactlyOnceWith({
      dsn: 'https://14122c7a96c0bbf2326ceea19d0c9bcd@o1088571.ingest.us.sentry.io/4508023095361536',
      tracesSampleRate: 1,
      debug: false,
    });
    expect(replayIntegration).not.toHaveBeenCalled();
    expect(onRequestError).toBe(captureRequestError);
  });
});
