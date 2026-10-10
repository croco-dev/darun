import { Inject, Service } from 'typedi';
import { productInvalidArgs, productNotFound } from '../errors/productError';
import type { ProductFlowRepository } from '../repositories/ProductFlowRepository';
import { ProductFlowRepositoryToken } from '../repositories/ProductFlowRepository';
import { hashVisualViewerIp } from '../utils/hashVisualViewerIp';

const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

type TrackVisualFlowViewArgs = {
  id: string;
  viewerIp: string;
};

export type TrackVisualFlowViewResult = {
  tracked: boolean;
};

/**
 * M2 플로 조회 기록. 익명 허용·IP 해시 기반·로그인 불필요.
 * - 존재하지 않는 플로면 productFlowNotFound相当(productNotFound)
 * - 같은 viewer의 24시간 내 중복은 무시(tracked: false)
 */
@Service()
export class TrackVisualFlowView {
  constructor(
    @Inject(ProductFlowRepositoryToken)
    private readonly productFlowRepository: ProductFlowRepository
  ) {}

  async execute({ id, viewerIp }: TrackVisualFlowViewArgs): Promise<TrackVisualFlowViewResult> {
    if (!ULID_PATTERN.test(id)) {
      throw productInvalidArgs('잘못된 플로 ID 형식입니다.');
    }
    const flow = await this.productFlowRepository.findVisualPublishedById(id);
    if (!flow) {
      throw productNotFound();
    }
    const viewerHash = hashVisualViewerIp(viewerIp);
    const tracked = await this.productFlowRepository.insertVisualViewEvent({ flowId: id, viewerHash });
    return { tracked };
  }
}
