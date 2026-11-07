import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sign, notify, cleanups } = vi.hoisted(() => ({
  sign: vi.fn(),
  notify: vi.fn(),
  cleanups: [] as Array<() => void>,
}));
vi.mock('@apollo/client', () => ({ gql: () => ({}) }));
vi.mock('@apollo/client/react', () => ({ useMutation: () => [sign] }));
vi.mock('@darun/provider-graphql', () => ({ SignImageUploadDocument: {} }));
vi.mock('@mantine/notifications', () => ({ notifications: { show: notify } }));
vi.mock('react', () => ({
  useRef: <T>(current: T) => ({ current }),
  useEffect: (effect: () => (() => void) | undefined) => {
    const cleanup = effect();
    if (cleanup) cleanups.push(cleanup);
  },
}));

import { useImageUpload } from './useImageUpload';

const signed = {
  data: {
    signImageUpload: {
      signature: 'signature',
      folder: 'signed-folder',
      timestamp: 123,
    },
  },
};
const file = new File(['image'], 'logo.png', { type: 'image/png' });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(settle => {
    resolve = settle;
  });
  return { promise, resolve };
}

function observe(promise: Promise<unknown>) {
  const outcome: { state: string; value?: unknown } = { state: 'pending' };
  void promise.then(
    value => {
      outcome.state = 'resolved';
      outcome.value = value;
    },
    error => {
      outcome.state = 'rejected';
      outcome.value = error;
    }
  );
  return outcome;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'fixture-cloud');
  vi.stubEnv('NEXT_PUBLIC_CLOUDINARY_API_KEY', 'fixture-key');
  sign.mockResolvedValue(signed);
});
afterEach(() => {
  cleanups.splice(0).forEach(cleanup => cleanup());
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('image upload lifetime', () => {
  it.each(['fetch', 'body', 'signature'])('ends a stalled %s at the 60-second total deadline', async stage => {
    const never = new Promise<never>(() => undefined);
    if (stage === 'signature') sign.mockReturnValue(never);
    const fetchUpload = vi.fn((_url: string, _init: RequestInit) =>
      stage === 'fetch' ? never : Promise.resolve({ ok: true, json: () => never })
    );
    vi.stubGlobal('fetch', fetchUpload);
    const outcome = observe(useImageUpload().upload('requested-folder', file, 'logo'));
    await vi.advanceTimersByTimeAsync(59_999);
    expect(outcome.state).toBe('pending');
    await vi.advanceTimersByTimeAsync(1);
    expect(outcome.state).toBe('rejected');
    expect(outcome.value).toMatchObject({ name: 'TimeoutError' });
    expect(vi.getTimerCount()).toBe(0);
    const signal =
      stage === 'signature' ? sign.mock.calls[0][0].context.fetchOptions.signal : fetchUpload.mock.calls[0][1].signal;
    expect(signal.aborted).toBe(true);
  });

  it('shares one deadline between signing, upload and body completion', async () => {
    const signature = deferred<typeof signed>();
    const body = deferred<{ secure_url: string }>();
    sign.mockReturnValue(signature.promise);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: () => body.promise }))
    );
    const outcome = observe(useImageUpload().upload('requested-folder', file, 'logo'));
    await vi.advanceTimersByTimeAsync(45_000);
    signature.resolve(signed);
    await vi.advanceTimersByTimeAsync(14_999);
    expect(outcome.state).toBe('pending');
    await vi.advanceTimersByTimeAsync(1);
    expect(outcome.value).toMatchObject({ name: 'TimeoutError' });
    body.resolve({ secure_url: 'https://fixture.invalid/late.png' });
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome.state).toBe('rejected');
    expect(notify).not.toHaveBeenCalled();
  });

  it('does not begin signing when the caller has already cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(useImageUpload().upload('folder', file, 'logo', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(sign).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['caller', 'unmount'])('cancels signing on %s and ignores a late signature', async trigger => {
    const signature = deferred<typeof signed>();
    sign.mockReturnValue(signature.promise);
    const fetchUpload = vi.fn();
    vi.stubGlobal('fetch', fetchUpload);
    const controller = new AbortController();
    const outcome = observe(useImageUpload().upload('folder', file, 'logo', controller.signal));
    if (trigger === 'caller') controller.abort();
    else cleanups.splice(0).forEach(cleanup => cleanup());
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome.state).toBe('rejected');
    expect(outcome.value).toMatchObject({ name: 'AbortError' });
    signature.resolve(signed);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchUpload).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels body reading and suppresses a late provider error', async () => {
    const body = deferred<{ error: { message: string } }>();
    const fetchUpload = vi.fn(async (_url: string, _init: RequestInit) => ({
      ok: false,
      json: () => body.promise,
    }));
    vi.stubGlobal('fetch', fetchUpload);
    const controller = new AbortController();
    const outcome = observe(useImageUpload().upload('folder', file, 'logo', controller.signal));
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome.value).toMatchObject({ name: 'AbortError' });
    expect(fetchUpload.mock.calls[0][1].signal?.aborted).toBe(true);
    body.resolve({ error: { message: 'late provider failure' } });
    await vi.advanceTimersByTimeAsync(0);
    expect(notify).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts the active transport and leaves a subsequent upload usable', async () => {
    const fetchUpload = vi.fn((_url: string, init: RequestInit) => {
      void _url;
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
      });
    });
    vi.stubGlobal('fetch', fetchUpload);
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const uploader = useImageUpload();
    const outcome = observe(uploader.upload('folder', file, 'logo', controller.signal));
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome.value).toMatchObject({ name: 'AbortError' });
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ secure_url: 'https://fixture.invalid/retry.png' }) }))
    );
    await expect(uploader.upload('folder', file, 'logo')).resolves.toBe('https://fixture.invalid/retry.png');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves signed fields and removes caller listeners after success', async () => {
    const fetchUpload = vi.fn(async (_url: string, _init: RequestInit) => ({
      ok: true,
      json: async () => ({ secure_url: 'https://fixture.invalid/logo.png' }),
    }));
    vi.stubGlobal('fetch', fetchUpload);
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    await expect(useImageUpload().upload('folder', file, 'Logo', controller.signal)).resolves.toBe(
      'https://fixture.invalid/logo.png'
    );
    const init = fetchUpload.mock.calls[0][1];
    const body = init.body as FormData;
    expect(body.get('folder')).toBe('signed-folder');
    expect(body.get('public_id')).toBe(sign.mock.calls[0][0].variables.input.displayName);
    expect(body.get('signature')).toBe('signature');
    expect(body.get('timestamp')).toBe('123');
    expect(body.get('api_key')).toBe('fixture-key');
    expect(body.get('file')).toBe(file);
    expect(init.signal).toBe(sign.mock.calls[0][0].context.fetchOptions.signal);
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
    controller.abort();
    expect(init.signal?.aborted).toBe(false);
  });
});
