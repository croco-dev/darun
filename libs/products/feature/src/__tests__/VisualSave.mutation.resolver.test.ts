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

// Exercise the actual schema and use cases: cursor encoding must use save identity, not target ID.
describe.each(['Screenshots', 'Flows'] as const)('myVisualSaved%s cursor', kind => {
  it('계정·종류에 묶인 마이크로초 경계를 다음 조회에 전달하고 잘못된 커서를 거절한다', async () => {
    const { GetMyVisualSavedScreenshots, GetMyVisualSavedFlows } = await import('@darun/products-domain');
    const { Cursor } = await import('@darun/utils-apollo-server');
    vi.stubEnv('CURSOR_SIGNATURE_SECRET', 'visual-save-test-signature-secret');
    try {
      const boundary = {
        savedAt: '2026-01-02T03:04:05.123456',
        saveId: '01M4J60S333ZQJYAFX4RA6SBWN',
      };
      const screenshot = {
        id,
        imageUrl: 'https://example.com/a',
        imageAlt: 'Saved',
        productId: 'product',
        productName: 'Product',
        productSlug: 'product',
        productLogoUrl: '',
        productSummary: '',
        saveCursor: boundary,
      };
      const flow = {
        id,
        title: 'Saved flow',
        description: '',
        platform: 'WEB',
        flowType: 'SEARCH',
        stepCount: 1,
        productId: 'product',
        productName: 'Product',
        productSlug: 'product',
        productLogoUrl: '',
        productSummary: '',
        coverScreenshot: screenshot,
        saveCursor: boundary,
      };
      const readShots = vi.fn().mockResolvedValue({
        screenshots: [screenshot, screenshot],
        totalCount: 2,
      });
      const readFlows = vi.fn().mockResolvedValue({ flows: [flow, flow], totalCount: 2 });
      const resolver = Object.assign(Object.create(VisualSaveMutationResolver.prototype), {
        getMyVisualSavedScreenshotsUseCase: new GetMyVisualSavedScreenshots({
          findManyVisualSavedScreenshotsByUser: readShots,
        } as unknown as ProductScreenshotRepository),
        getMyVisualSavedFlowsUseCase: new GetMyVisualSavedFlows({
          findManyVisualSavedFlowsByUser: readFlows,
        } as unknown as ProductFlowRepository),
      });
      const schema = buildSchemaSync({
        resolvers: [VisualSaveMutationResolver],
        container: { get: () => resolver },
        authChecker: () => true,
      });
      const source = `query($after: String, $page: Int) { myVisualSaved${kind}(first: 1, page: $page, after: $after) { edges { cursor node { id } } pageInfo { hasNextPage endCursor } } }`;
      const run = (after?: string, userId = 'reader', page = 0) =>
        graphql({
          schema,
          source,
          variableValues: { after, page },
          contextValue: { getUserIdOrThrow: async () => userId },
        });
      const result = await run();
      expect(result.errors).toBeUndefined();
      const connection = result.data?.[`myVisualSaved${kind}`] as {
        edges: { cursor: string; node: { id: string } }[];
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
      expect(connection.edges).toHaveLength(1);
      expect(connection.edges[0].node.id).toBe(id);
      expect(connection.pageInfo.hasNextPage).toBe(true);
      const cursor = connection.pageInfo.endCursor;
      const targetKind = kind === 'Screenshots' ? 'screenshot' : 'flow';
      expect(Cursor.decode(cursor, ['savedAt', 'saveId', 'userId', 'kind'] as const)).toEqual({
        ...boundary,
        userId: 'reader',
        kind: targetKind,
      });
      const read = kind === 'Screenshots' ? readShots : readFlows;
      expect((await run(cursor, 'reader', 9)).errors).toBeUndefined();
      expect(read).toHaveBeenLastCalledWith({
        userId: 'reader',
        limit: 2,
        offset: 0,
        after: boundary,
      });
      for (const invalid of [
        '',
        'forged',
        Cursor.encode(
          {
            ...boundary,
            userId: 'reader',
            kind: targetKind === 'flow' ? 'screenshot' : 'flow',
          },
          ['savedAt', 'saveId', 'userId', 'kind']
        ),
        Cursor.encode(
          {
            ...boundary,
            savedAt: '2026-02-30T03:04:05.123456',
            userId: 'reader',
            kind: targetKind,
          },
          ['savedAt', 'saveId', 'userId', 'kind']
        ),
        Cursor.encode(
          {
            ...boundary,
            savedAt: 'not-a-date',
            userId: 'reader',
            kind: targetKind,
          },
          ['savedAt', 'saveId', 'userId', 'kind']
        ),
        Cursor.encode(
          {
            ...boundary,
            saveId: "'); DROP TABLE visual_saves;--",
            userId: 'reader',
            kind: targetKind,
          },
          ['savedAt', 'saveId', 'userId', 'kind']
        ),
        Cursor.encode({ id }, ['id']),
      ]) {
        read.mockClear();
        expect((await run(invalid)).errors).toHaveLength(1);
        expect(read).not.toHaveBeenCalled();
      }
      expect((await run(cursor, 'another-account')).errors).toHaveLength(1);
      expect(read).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
