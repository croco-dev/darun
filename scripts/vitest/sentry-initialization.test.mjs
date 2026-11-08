import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const { init, replayIntegration, captureRequestError } = vi.hoisted(() => ({
  init: vi.fn(),
  replayIntegration: vi.fn(() => ({ name: 'Replay' })),
  captureRequestError: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({ init, replayIntegration, captureRequestError }));

const appRoot = process.cwd();
const browserTraceRates = { 'service-web': 0.1, 'visual-web': 1 };
const traceRate = browserTraceRates[basename(appRoot)];
if (traceRate === undefined) throw new Error('Run this suite from service-web or visual-web');
const browserEntry = pathToFileURL(join(appRoot, 'instrumentation-client.ts')).href;
const serverEntry = pathToFileURL(join(appRoot, 'instrumentation.ts')).href;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => vi.unstubAllEnvs());

describe(`${basename(appRoot)} Sentry initialization entrypoints`, () => {
  it('initializes the browser once with the existing sampling and replay policy', async () => {
    await import(browserEntry);
    await import(browserEntry);

    expect(init).toHaveBeenCalledExactlyOnceWith({
      dsn: 'https://14122c7a96c0bbf2326ceea19d0c9bcd@o1088571.ingest.us.sentry.io/4508023095361536',
      integrations: [{ name: 'Replay' }],
      tracesSampleRate: traceRate,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      debug: false,
    });
    expect(replayIntegration).toHaveBeenCalledOnce();
  });

  it.each(['nodejs', 'edge'])('keeps %s request instrumentation separate from browser replay', async runtime => {
    vi.stubEnv('NEXT_RUNTIME', runtime);
    const { register, onRequestError } = await import(serverEntry);
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
