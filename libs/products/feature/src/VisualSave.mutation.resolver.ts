import {
  GetMyVisualSavedFlows,
  GetMyVisualSavedScreenshots,
  GetMyVisualSaves,
  GetVisualSaveStatus,
  ToggleVisualFlowSave,
  ToggleVisualScreenshotSave,
  VISUAL_SAVES_MAX_FIRST,
} from '@darun/products-domain';
import type { GraphQLContext } from '@darun/utils-apollo-server';
import { Cursor } from '@darun/utils-apollo-server';
import { Arg, Ctx, Int, Mutation, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { VisualFlowConnection } from './graphs/VisualFlowConnection';
import { ToggleVisualSavePayload, VisualSaveStatusPayload } from './graphs/VisualSave';
import { VisualScreenshotConnection } from './graphs/VisualScreenshotConnection';
import { toGraphVisualFlow } from './VisualFlow.query.resolver';
import { toGraphVisualScreenshot } from './VisualScreenshot.query.resolver';

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
    getMyVisualSavedFlowsUseCase: GetMyVisualSavedFlows
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
   * first 상한(VISUAL_SAVES_MAX_FIRST), page 0-based 오프셋, 디폴트 LATEST 유지.
   */
  @Query(() => VisualScreenshotConnection)
  async myVisualSavedScreenshots(
    @Arg('first', () => Int, { nullable: true }) first: number | null,
    @Arg('page', () => Int, { nullable: true }) page: number | null,
    @Ctx() ctx: GraphQLContext
  ): Promise<VisualScreenshotConnection> {
    const userId = await ctx.getUserIdOrThrow();
    const { screenshots, totalCount, hasNextPage } = await this.getMyVisualSavedScreenshotsUseCase.execute({
      userId,
      first: first ?? VISUAL_SAVES_MAX_FIRST,
      page: page ?? 0,
    });
    const edges = screenshots.map(node => {
      const screenshot = toGraphVisualScreenshot(node);
      return { node: screenshot, cursor: Cursor.encode(screenshot, ['id'] as const) };
    });
    return {
      totalCount,
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: (page ?? 0) > 0,
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
    @Ctx() ctx: GraphQLContext
  ): Promise<VisualFlowConnection> {
    const userId = await ctx.getUserIdOrThrow();
    const { flows, totalCount, hasNextPage } = await this.getMyVisualSavedFlowsUseCase.execute({
      userId,
      first: first ?? VISUAL_SAVES_MAX_FIRST,
      page: page ?? 0,
    });
    const edges = flows.map(node => {
      const flow = toGraphVisualFlow(node);
      return { node: flow, cursor: Cursor.encode(flow, ['id'] as const) };
    });
    return {
      totalCount,
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: (page ?? 0) > 0,
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
    };
  }
}
