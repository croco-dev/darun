import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { translationJobFixture } from './translationJobFixture';

describe('Source complete translation orchestration', () => {
  it.each(['Product', 'Magazine', 'ProductFeature'] as const)(
    '%s 요청을 실제 pending job으로 영속화하고 LLM은 호출하지 않는다',
    async entityType => {
      const fixture = translationJobFixture({ entityType, entityId: 'source-1' });
      const fields = entityType === 'Magazine' ? ['title', 'summary'] : ['name', 'summary'];
      const job = await fixture.service.requestTranslationJob(entityType, 'source-1', fields);
      expect(job.status).toBe('pending');
      expect(fixture.repository.createJob).toHaveBeenCalledWith(
        expect.objectContaining({ entityType, fields, entityId: 'source-1' })
      );
      expect(fixture.queue.sendJob).toHaveBeenCalledWith({ jobId: job.id, entityType, entityId: 'source-1' });
      expect(fixture.provider.translateSingle).not.toHaveBeenCalled();
    }
  );
  it('원문 읽기에 실패하면 job 등록이나 provider 호출을 하지 않는다', async () => {
    const fixture = translationJobFixture();
    fixture.source.read.mockRejectedValue(new Error('source unavailable'));
    await expect(fixture.service.requestTranslationJob('Magazine', 'm1', ['title'])).rejects.toThrow(
      'source unavailable'
    );
    expect(fixture.repository.createJob).not.toHaveBeenCalled();
  });
  it('하나의 field 실패는 모든 row를 버리고 실패 상태만 fencing한다', async () => {
    const fixture = translationJobFixture();
    fixture.provider.translateSingle
      .mockResolvedValueOnce({ translatedText: 'Title', sourceHash: 'bogus', model: 'test-model', promptVersion: 'v2' })
      .mockRejectedValueOnce(new Error('second field failed'));
    await fixture.service.executeTranslationJob(
      'job-1',
      { entityType: 'Magazine', entityId: 'm1' },
      { leaseToken: 'attempt-1' }
    );
    expect(fixture.source.commit).not.toHaveBeenCalled();
    expect(fixture.repository.completeJobLease).toHaveBeenCalledWith(
      'job-1',
      'attempt-1',
      'failed',
      expect.objectContaining({ error: 'second field failed' })
    );
  });
  it('provider hash 대신 server source로 rows를 만들고 완료는 source store transaction만 소유한다', async () => {
    const fixture = translationJobFixture();
    await fixture.service.executeTranslationJob(
      'job-1',
      { entityType: 'Magazine', entityId: 'm1' },
      { leaseToken: 'attempt-1' }
    );
    expect(fixture.source.commit).toHaveBeenCalledTimes(1);
    const input = fixture.source.commit.mock.calls[0]![0];
    expect(input.rows).toHaveLength(2);
    expect(input.rows[0].sourceHash).toMatch(/^[a-f\d]{64}$/);
    expect(input.rows[0].sourceHash).not.toBe('untrusted-provider-hash');
    expect(input.snapshot.sourceHash).toBe('server-snapshot');
    expect(fixture.provider.translateSingle.mock.calls.every(([request]) => request.mode === 'editorial')).toBe(true);
    expect(fixture.repository.completeJobLease).not.toHaveBeenCalled();
  });
  it('재조회 실패는 row 0건과 명시적 failed attempt로 끝난다', async () => {
    const fixture = translationJobFixture();
    fixture.source.commit.mockRejectedValue(new Error('source reread failed'));
    await fixture.service.executeTranslationJob('job-1', { entityType: 'Magazine', entityId: 'm1' });
    expect(fixture.repository.completeJobLease).toHaveBeenCalledWith(
      'job-1',
      expect.any(String),
      'failed',
      expect.objectContaining({ error: 'source reread failed' })
    );
  });
});
