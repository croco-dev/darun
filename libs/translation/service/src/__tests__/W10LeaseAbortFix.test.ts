/// <reference lib="es2024.promise" />
import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { translationJobFixture } from './translationJobFixture';

describe('Translation bounded abort fencing', () => {
  afterEach(() => vi.useRealTimers());
  it('provider가 abort를 무시해도 deadline 이후 결과를 commit하지 않는다', async () => {
    vi.useFakeTimers();
    const fixture = translationJobFixture();
    const late = Promise.withResolvers<unknown>();
    fixture.provider.translateSingle.mockImplementation(() => late.promise);
    const run = fixture.service.executeTranslationJob(
      'job-1',
      { entityType: 'Magazine', entityId: 'm1' },
      { stageBudgetMs: 20 }
    );
    await vi.advanceTimersByTimeAsync(25);
    late.resolve({ translatedText: 'late', sourceHash: 'bogus', model: 'test-model', promptVersion: 'v2' });
    await run;
    expect(fixture.source.commit).not.toHaveBeenCalled();
    expect(fixture.repository.completeJobLease).not.toHaveBeenCalled();
  });
  it('이미 중단된 parent는 provider를 실행하거나 row를 쓰지 않는다', async () => {
    const fixture = translationJobFixture();
    const controller = new AbortController();
    controller.abort();
    await fixture.service.executeTranslationJob(
      'job-1',
      { entityType: 'Magazine', entityId: 'm1' },
      { signal: controller.signal }
    );
    expect(fixture.provider.translateSingle).not.toHaveBeenCalled();
    expect(fixture.source.commit).not.toHaveBeenCalled();
  });
});
