import 'reflect-metadata';
import { SetVisualFlowSave, SetVisualScreenshotSave } from '@darun/products-domain';
import type { ProductFlowRepository, ProductScreenshotRepository } from '@darun/products-domain';
import { buildSchemaSync } from 'type-graphql';
import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { VisualSaveMutationResolver } from '../VisualSave.mutation.resolver';

const { graphql } = createRequire(import.meta.url)('graphql') as typeof import('graphql');
const id = '01M4J60S333ZQJYAFX4RA6SBWM';

describe.each(['Screenshot', 'Flow'] as const)('setVisual%sSave GraphQL', kind => {
  function fixture(published = true) {
    const setVisualSave = vi.fn().mockImplementation(async ({ saved }: { saved: boolean }) => ({ saved }));
    const findVisualPublishedById = vi.fn().mockResolvedValue(published ? { id } : null);
    const repo = { setVisualSave, findVisualPublishedById };
    const resolver = Object.assign(Object.create(VisualSaveMutationResolver.prototype), {
      setVisualScreenshotSaveUseCase: new SetVisualScreenshotSave(repo as unknown as ProductScreenshotRepository),
      setVisualFlowSaveUseCase: new SetVisualFlowSave(repo as unknown as ProductFlowRepository),
    });
    const schema = buildSchemaSync({
      resolvers: [VisualSaveMutationResolver],
      container: { get: () => resolver },
      authChecker: () => true,
    });
    const source = `mutation($input: SetVisualSaveInput!) { setVisual${kind}Save(input: $input) { saved } }`;
    const contextValue = { getUserIdOrThrow: vi.fn().mockResolvedValue('verified-account') };
    return {
      repo,
      contextValue,
      run: (input: unknown) => graphql({ schema, source, variableValues: { input }, contextValue }),
    };
  }
  it.each([true, false])('검증된 계정과 명시한 저장 %s를 전달하고 결과를 반환한다', async saved => {
    const { repo, run } = fixture();
    const result = await run({ id, saved });
    expect(result.errors).toBeUndefined();
    expect(result.data?.[`setVisual${kind}Save`]).toEqual({ saved });
    expect(repo.setVisualSave).toHaveBeenCalledWith({
      [kind === 'Screenshot' ? 'screenshotId' : 'flowId']: id,
      userId: 'verified-account',
      saved,
    });
  });
  it('미인증 요청은 대상 조회·저장을 실행하지 않는다', async () => {
    const { repo, contextValue, run } = fixture();
    contextValue.getUserIdOrThrow.mockRejectedValue(new Error('Unauthenticated'));
    expect((await run({ id, saved: true })).errors).toHaveLength(1);
    expect(repo.findVisualPublishedById).not.toHaveBeenCalled();
    expect(repo.setVisualSave).not.toHaveBeenCalled();
  });
  it.each([{ id, saved: null }, { id, saved: 'false' }, { id }, { id, saved: true, userId: 'forged' }])(
    '잘못된 입력은 저장하지 않는다: %j',
    async input => {
      const { repo, run } = fixture();
      expect((await run(input)).errors?.length).toBeGreaterThan(0);
      expect(repo.setVisualSave).not.toHaveBeenCalled();
    }
  );
  it.each([true, false])('존재하지 않거나 미공개인 대상의 저장 %s를 거절한다', async saved => {
    const { repo, run } = fixture(false);
    expect((await run({ id, saved })).errors).toHaveLength(1);
    expect(repo.setVisualSave).not.toHaveBeenCalled();
  });
  it('잘못된 대상 ID는 저장소 조회 전 거절한다', async () => {
    const { repo, run } = fixture();
    expect((await run({ id: 'invalid', saved: true })).errors).toHaveLength(1);
    expect(repo.findVisualPublishedById).not.toHaveBeenCalled();
    expect(repo.setVisualSave).not.toHaveBeenCalled();
  });
});
