import { TrackVisualFlowView, TrackVisualScreenshotView, productInvalidArgs } from '@darun/products-domain';
import type { GraphQLContext } from '@darun/utils-apollo-server';
import { Arg, Ctx, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { TrackVisualViewPayload } from './graphs/TrackVisualView';

/**
 * M2 조회 기록 mutation. AUTH_POLICY 패턴 5(IP 기반, 인증 불필요).
 * 익명 허용·로그인 불필요·IP 해시만 저장(IP 원문 저장 금지).
 * 상세 조회 경로에 영향을 주지 않도록 실패해도 조용히 tracked: false를 반환한다.
 */
@Service()
@Resolver()
export class VisualViewMutationResolver {
  constructor(
    trackVisualScreenshotViewUseCase: TrackVisualScreenshotView,
    trackVisualFlowViewUseCase: TrackVisualFlowView
  ) {
    this.trackVisualScreenshotViewUseCase = trackVisualScreenshotViewUseCase;
    this.trackVisualFlowViewUseCase = trackVisualFlowViewUseCase;
  }

  private readonly trackVisualScreenshotViewUseCase: TrackVisualScreenshotView;
  private readonly trackVisualFlowViewUseCase: TrackVisualFlowView;

  @Mutation(() => TrackVisualViewPayload)
  async trackVisualScreenshotView(@Arg('id') id: string, @Ctx() ctx: GraphQLContext): Promise<TrackVisualViewPayload> {
    if (!ctx.clientIp) {
      throw productInvalidArgs('Client IP is required for view tracking');
    }
    try {
      const { tracked } = await this.trackVisualScreenshotViewUseCase.execute({ id, viewerIp: ctx.clientIp });
      return { tracked };
    } catch {
      return { tracked: false };
    }
  }

  @Mutation(() => TrackVisualViewPayload)
  async trackVisualFlowView(@Arg('id') id: string, @Ctx() ctx: GraphQLContext): Promise<TrackVisualViewPayload> {
    if (!ctx.clientIp) {
      throw productInvalidArgs('Client IP is required for view tracking');
    }
    try {
      const { tracked } = await this.trackVisualFlowViewUseCase.execute({ id, viewerIp: ctx.clientIp });
      return { tracked };
    } catch {
      return { tracked: false };
    }
  }
}
