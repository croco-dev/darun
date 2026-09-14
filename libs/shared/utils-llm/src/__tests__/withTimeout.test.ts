import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withTimeout } from '../withTimeout';

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves when the promise settles before timeout', async () => {
    const promise = new Promise<string>(resolve => {
      setTimeout(() => resolve('success'), 100);
    });

    const resultPromise = withTimeout(promise, 500, 'Timed out');
    await vi.advanceTimersByTimeAsync(100);

    await expect(resultPromise).resolves.toBe('success');
  });

  it('rejects with timeout message when the promise takes too long', async () => {
    const promise = new Promise<string>(() => {
      // never resolves
    });

    const resultPromise = withTimeout(promise, 500, 'Custom timeout error');
    const assertion = expect(resultPromise).rejects.toThrow('Custom timeout error');

    await vi.advanceTimersByTimeAsync(500);
    await assertion;
  });

  it('clears timeout timer on promise rejection', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const promise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('immediate failure')), 50);
    });

    const resultPromise = withTimeout(promise, 500, 'Timed out');
    const assertion = expect(resultPromise).rejects.toThrow('immediate failure');

    await vi.advanceTimersByTimeAsync(50);
    await assertion;

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
