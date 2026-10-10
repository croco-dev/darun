import { Inject, Service } from 'typedi';
import { productInvalidArgs, productNotFound } from '../errors/productError';
import type { ProductScreenshotRepository } from '../repositories/ProductScreenshotRepository';
import { ProductScreenshotRepositoryToken } from '../repositories/ProductScreenshotRepository';
import { hashVisualViewerIp } from '../utils/hashVisualViewerIp';

const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

type TrackVisualScreenshotViewArgs = {
  id: string;
  viewerIp: string;
};

export type TrackVisualScreenshotViewResult = {
  tracked: boolean;
};

/**
 * M2 화면 조회 기록. 익명 허용·IP 해시 기반·로그인 불필요.
 * - 존재하지 않는 화면이면 productNotFound
 * - 같은 viewer의 24시간 내 중복은 무시(tracked: false)
 * - 에러는 호출자에게 전파하지 않고 조용히 무시하는 것을 권장(상세 조회 경로에 영향 금지)
 */
@Service()
export class TrackVisualScreenshotView {
  constructor(
    @Inject(ProductScreenshotRepositoryToken)
    private readonly productScreenshotRepository: ProductScreenshotRepository
  ) {}

  async execute({ id, viewerIp }: TrackVisualScreenshotViewArgs): Promise<TrackVisualScreenshotViewResult> {
    if (!ULID_PATTERN.test(id)) {
      throw productInvalidArgs('잘못된 화면 ID 형식입니다.');
    }
    const screenshot = await this.productScreenshotRepository.findVisualPublishedById(id);
    if (!screenshot) {
      throw productNotFound();
    }
    const viewerHash = hashVisualViewerIp(viewerIp);
    const tracked = await this.productScreenshotRepository.insertVisualViewEvent({
      screenshotId: id,
      viewerHash,
    });
    return { tracked };
  }
}
