import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { translationJobFixture } from '../../../service/src/__tests__/translationJobFixture';

describe('Translation persisted retry and recovery', () => {
  it.each(['Product', 'Magazine', 'ProductFeature'] as const)(
    '%s retry는 원래 fields와 queue identity를 보존한다',
    async entityType => {
      const fields = entityType === 'Magazine' ? ['content'] : ['summary'];
      const fixture = translationJobFixture({ entityType, entityId: 'source-1', fields, status: 'failed' });
      const retried = await fixture.service.retryProductTranslationJob('job-1');
      expect(retried.fields).toEqual(fields);
      expect(retried.id).toBe('job-new');
      expect(retried.retryOfJobId).toBe('job-1');
      expect(fixture.job.status).toBe('failed');
      expect(fixture.queue.sendJob).toHaveBeenCalledWith({ jobId: 'job-new', entityType, entityId: 'source-1' });
      // 새 retry 등록과 최신 intent 연결은 두 commit이 아닌 앱 adapter의 원자 호출 하나로 처리한다.
      expect(fixture.source.createRetryJob).toHaveBeenCalledWith('job-1');
      expect(fixture.repository.createJob).not.toHaveBeenCalled();
    }
  );
  it('실행/완료 상태의 retry는 소유권을 변경하지 않는다', async () => {
    for (const status of ['in_progress', 'completed', 'superseded'] as const) {
      const fixture = translationJobFixture({ status });
      await expect(fixture.service.retryProductTranslationJob('job-1')).rejects.toThrow(/재시도할 수 없는/);
      expect(fixture.repository.createJob).not.toHaveBeenCalled();
      expect(fixture.source.createRetryJob).not.toHaveBeenCalled();
    }
  });
  it('pending 재전송은 새 job을 만들지 않고 같은 job을 다시 보낸다', async () => {
    const fixture = translationJobFixture({ status: 'pending' });
    const resent = await fixture.service.retryProductTranslationJob('job-1');
    expect(resent.id).toBe('job-1');
    expect(fixture.source.createRetryJob).not.toHaveBeenCalled();
    expect(fixture.repository.createJob).not.toHaveBeenCalled();
    expect(fixture.queue.sendJob).toHaveBeenCalledWith({ jobId: 'job-1', entityType: 'Magazine', entityId: 'm1' });
  });
  it('재시도 등록 실패는 queue로 전송하지 않고 오류를 전파한다', async () => {
    const fixture = translationJobFixture({ status: 'failed' });
    fixture.source.createRetryJob.mockRejectedValueOnce(new Error('retry registration failed'));
    await expect(fixture.service.retryProductTranslationJob('job-1')).rejects.toThrow('retry registration failed');
    expect(fixture.queue.sendJob).not.toHaveBeenCalled();
  });
  it('큐 전송 실패는 pending job을 남기고 recovery가 다시 전송한다', async () => {
    const fixture = translationJobFixture();
    fixture.queue.sendJob.mockRejectedValueOnce(new Error('queue unavailable'));
    expect((await fixture.service.requestTranslationJob('Magazine', 'm1', ['title'])).queued).toBe(false);
    expect(await fixture.service.recoverInterruptedJobs()).toEqual({ recovered: 1, queued: 1 });
    expect(fixture.repository.findOrCreateActiveJob).toHaveBeenCalledTimes(1);
  });
});
