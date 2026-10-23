import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { translationJobFixture } from './translationJobFixture';

describe('Translation atomic terminal ownership', () => {
  it.each(['superseded', 'lease_lost'] as const)('%s 결과를 별도 completed로 덮어쓰지 않는다', async outcome => {
    const fixture = translationJobFixture();
    fixture.source.commit.mockResolvedValue(outcome);
    await fixture.service.executeTranslationJob('job-1', { entityType: 'Magazine', entityId: 'm1' });
    expect(fixture.repository.completeJobLease).not.toHaveBeenCalled();
  });
  it('큐 payload의 다른 entity는 영속 job의 attempt를 선점하지 못한다', async () => {
    const fixture = translationJobFixture();
    await expect(
      fixture.service.executeTranslationJob('job-1', { entityType: 'Product', entityId: 'm1' })
    ).rejects.toThrow(/identity mismatch/);
    expect(fixture.repository.claimJobLease).not.toHaveBeenCalled();
  });
  it('duplicate delivery가 선점에 실패하면 provider와 commit을 실행하지 않는다', async () => {
    const fixture = translationJobFixture();
    fixture.repository.claimJobLease.mockResolvedValue(null);
    await fixture.service.executeTranslationJob('job-1', { entityType: 'Magazine', entityId: 'm1' });
    expect(fixture.provider.translateSingle).not.toHaveBeenCalled();
    expect(fixture.source.commit).not.toHaveBeenCalled();
  });
});
