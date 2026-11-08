import {
  GetMyVisualSavedFlows,
  GetMyVisualSavedScreenshots,
  GetMyVisualSaves,
  GetVisualSaveStatus,
  SetVisualFlowSave,
  SetVisualScreenshotSave,
  ToggleVisualFlowSave,
  ToggleVisualScreenshotSave,
  VISUAL_SAVES_MAX_FIRST,
  type VisualSaveCursor,
} from '@darun/products-domain';
import type { GraphQLContext } from '@darun/utils-apollo-server';
import { Cursor } from '@darun/utils-apollo-server';
import { Arg, Ctx, Int, Mutation, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { VisualFlowConnection } from './graphs/VisualFlowConnection';
import { SetVisualSavePayload, ToggleVisualSavePayload, VisualSaveStatusPayload } from './graphs/VisualSave';
import { VisualScreenshotConnection } from './graphs/VisualScreenshotConnection';
import { SetVisualSaveInput } from './inputs/SetVisualSaveInput';
import { toGraphVisualFlow } from './VisualFlow.query.resolver';
import { toGraphVisualScreenshot } from './VisualScreenshot.query.resolver';

function decodeSaveCursor(
  after: string | null | undefined,
  userId: string,
  kind: string
): VisualSaveCursor | undefined {
  if (after == null) return undefined;
  const decoded = Cursor.decode(after, ['userId', 'kind', 'savedAt', 'saveId'] as const);
  if (
    decoded.userId !== userId ||
    decoded.kind !== kind ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}$/.test(decoded.savedAt ?? '') ||
    !/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(decoded.saveId ?? '')
  ) {
    throw new Error('pagination/invalid-cursor');
  }
  const date = new Date(decoded.savedAt.slice(0, 23) + 'Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 23) !== decoded.savedAt.slice(0, 23)) {
    throw new Error('pagination/invalid-cursor');
  }
  return { savedAt: decoded.savedAt, saveId: decoded.saveId };
}

/**
 * M3 저장 토글·조회. AUTH_POLICY 패턴 4(Public + optional auth가 아니라
 * @Ctx + getUserIdOrThrow 조합 — @Authorized 없음, AuthRole 추가 없음).
 * 저장 대상 화면+플로 둘 다, 인증 로그인 필수, 정렬 디폴트 LATEST 유지.
 */
@Service()
@Resolver()
export class VisualSaveMutationResolver {
  constructor(
    toggleVisualScreenshotSaveUseCase: ToggleVisualScreenshotSave,
    toggleVisualFlowSaveUseCase: ToggleVisualFlowSave,
    getVisualSaveStatusUseCase: GetVisualSaveStatus,
    getMyVisualSavesUseCase: GetMyVisualSaves,
    getMyVisualSavedScreenshotsUseCase: GetMyVisualSavedScreenshots,
    getMyVisualSavedFlowsUseCase: GetMyVisualSavedFlows,
    private readonly setVisualScreenshotSaveUseCase: SetVisualScreenshotSave,
    private readonly setVisualFlowSaveUseCase: SetVisualFlowSave
  ) {
    this.toggleVisualScreenshotSaveUseCase = toggleVisualScreenshotSaveUseCase;
    this.toggleVisualFlowSaveUseCase = toggleVisualFlowSaveUseCase;
    this.getVisualSaveStatusUseCase = getVisualSaveStatusUseCase;
    this.getMyVisualSavesUseCase = getMyVisualSavesUseCase;
    this.getMyVisualSavedScreenshotsUseCase = getMyVisualSavedScreenshotsUseCase;
    this.getMyVisualSavedFlowsUseCase = getMyVisualSavedFlowsUseCase;
  }

  private readonly toggleVisualScreenshotSaveUseCase: ToggleVisualScreenshotSave;
  private readonly toggleVisualFlowSaveUseCase: ToggleVisualFlowSave;
  private readonly getVisualSaveStatusUseCase: GetVisualSaveStatus;
  private readonly getMyVisualSavesUseCase: GetMyVisualSaves;
  private readonly getMyVisualSavedScreenshotsUseCase: GetMyVisualSavedScreenshots;
  private readonly getMyVisualSavedFlowsUseCase: GetMyVisualSavedFlows;

  @Mutation(() => ToggleVisualSavePayload)
  async toggleVisualScreenshotSave(
    @Arg('id') id: string,
    @Ctx() ctx: GraphQLContext
  ): Promise<ToggleVisualSavePayload> {
    const userId = await ctx.getUserIdOrThrow();
    return this.toggleVisualScreenshotSaveUseCase.execute({ id, userId });
  }

  @Mutation(() => ToggleVisualSavePayload)
  async toggleVisualFlowSave(@Arg('id') id: string, @Ctx() ctx: GraphQLContext): Promise<ToggleVisualSavePayload> {
    const userId = await ctx.getUserIdOrThrow();
    return this.toggleVisualFlowSaveUseCase.execute({ id, userId });
  }

  @Mutation(() => SetVisualSavePayload)
  async setVisualScreenshotSave(
    @Arg('input', () => SetVisualSaveInput) input: SetVisualSaveInput,
    @Ctx() ctx: GraphQLContext
  ): Promise<SetVisualSavePayload> {
    const userId = await ctx.getUserIdOrThrow();
    return this.setVisualScreenshotSaveUseCase.execute({ ...input, userId });
  }

  @Mutation(() => SetVisualSavePayload)
  async setVisualFlowSave(
    @Arg('input', () => SetVisualSaveInput) input: SetVisualSaveInput,
    @Ctx() ctx: GraphQLContext
  ): Promise<SetVisualSavePayload> {
    const userId = await ctx.getUserIdOrThrow();
    return this.setVisualFlowSaveUseCase.execute({ ...input, userId });
  }

  @Query(() => VisualSaveStatusPayload)
  async visualScreenshotSaveStatus(
    @Arg('id') id: string,
    @Ctx() ctx: GraphQLContext
  ): Promise<VisualSaveStatusPayload> {
    const userId = await ctx.getUserIdOrThrow();
    return this.getVisualSaveStatusUseCase.screenshot({ id, userId });
  }

  @Query(() => VisualSaveStatusPayload)
  async visualFlowSaveStatus(@Arg('id') id: string, @Ctx() ctx: GraphQLContext): Promise<VisualSaveStatusPayload> {
    const userId = await ctx.getUserIdOrThrow();
    return this.getVisualSaveStatusUseCase.flow({ id, userId });
  }

  @Query(() => [String])
  async myVisualScreenshotSaves(
    @Arg('first', () => Int, { nullable: true }) first: number | null,
    @Arg('page', () => Int, { nullable: true }) page: number | null,
    @Ctx() ctx: GraphQLContext
  ): Promise<string[]> {
    const userId = await ctx.getUserIdOrThrow();
    const { ids } = await this.getMyVisualSavesUseCase.execute({
      userId,
      kind: 'screenshot',
      first: first ?? VISUAL_SAVES_MAX_FIRST,
      page: page ?? 0,
    });
    return ids;
  }

  @Query(() => [String])
  async myVisualFlowSaves(
    @Arg('first', () => Int, { nullable: true }) first: number | null,
    @Arg('page', () => Int, { nullable: true }) page: number | null,
    @Ctx() ctx: GraphQLContext
  ): Promise<string[]> {
    const userId = await ctx.getUserIdOrThrow();
    const { ids } = await this.getMyVisualSavesUseCase.execute({
      userId,
      kind: 'flow',
      first: first ?? VISUAL_SAVES_MAX_FIRST,
      page: page ?? 0,
    });
    return ids;
  }

  /**
   * M4 내 저장 화면 카드 목록. 로그인 필수, 저장 시각 내림차순.
   * first 상한(VISUAL_SAVES_MAX_FIRST), after 저장 경계 또는 기존 page 오프셋.
   */
  @Query(() => VisualScreenshotConnection)
  async myVisualSavedScreenshots(
    @Arg('first', () => Int, { nullable: true }) first: number | null,
    @Arg('page', () => Int, { nullable: true }) page: number | null,
    @Ctx() ctx: GraphQLContext,
    @Arg('after', () => String, { nullable: true }) after?: string | null
  ): Promise<VisualScreenshotConnection> {
    const userId = await ctx.getUserIdOrThrow();
    const { screenshots, totalCount, hasNextPage } = await this.getMyVisualSavedScreenshotsUseCase.execute({
      userId,
      first: first ?? VISUAL_SAVES_MAX_FIRST,
      page: page ?? 0,
      after: decodeSaveCursor(after, userId, 'screenshot'),
    });
    const edges = screenshots.map(node => {
      const screenshot = toGraphVisualScreenshot(node);
      return {
        node: screenshot,
        cursor: Cursor.encode({ ...node.saveCursor, userId, kind: 'screenshot' }, [
          'savedAt',
          'saveId',
          'userId',
          'kind',
        ]),
      };
    });
    return {
      totalCount,
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: after != null || (page ?? 0) > 0,
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
    };
  }

  /**
   * M4 내 저장 플로 카드 목록. 로그인 필수, 저장 시각 내림차순.
   */
  @Query(() => VisualFlowConnection)
  async myVisualSavedFlows(
    @Arg('first', () => Int, { nullable: true }) first: number | null,
    @Arg('page', () => Int, { nullable: true }) page: number | null,
    @Ctx() ctx: GraphQLContext,
    @Arg('after', () => String, { nullable: true }) after?: string | null
  ): Promise<VisualFlowConnection> {
    const userId = await ctx.getUserIdOrThrow();
    const { flows, totalCount, hasNextPage } = await this.getMyVisualSavedFlowsUseCase.execute({
      userId,
      first: first ?? VISUAL_SAVES_MAX_FIRST,
      page: page ?? 0,
      after: decodeSaveCursor(after, userId, 'flow'),
    });
    const edges = flows.map(node => {
      const flow = toGraphVisualFlow(node);
      return {
        node: flow,
        cursor: Cursor.encode({ ...node.saveCursor, userId, kind: 'flow' }, ['savedAt', 'saveId', 'userId', 'kind']),
      };
    });
    return {
      totalCount,
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: after != null || (page ?? 0) > 0,
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
    };
  }
}
