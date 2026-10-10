import {
  type ProductResearchDraftV1,
  type ProductResearchJobRepository,
  type ProductResearchMaterializationRepository,
  type ReviewedResearchFeature,
  productInvalidArgs,
  productSlugAlreadyExists,
} from '@darun/products-domain';
import { Inject, Service } from 'typedi';

export type ReviewedProductDraftInput = {
  researchJobId: string;
  name: string;
  slug: string;
  summary: string;
  logoUrl: string;
  officialUrl: string;
  categoryIds: string[];
  features: ReviewedResearchFeature[];
  tags: string[];
};

const MAX_NAME_CHARS = 100;
const MAX_SUMMARY_CHARS = 255;
const MAX_SLUG_CHARS = 100;
const MAX_FEATURES = 8;
const MAX_TAGS = 10;
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function clean(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function httpsUrl(value: string): string | null {
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (parsed.username || parsed.password) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

@Service()
export class ProductResearchReviewService {
  constructor(
    @Inject('ProductResearchJobRepository') private readonly jobRepository?: ProductResearchJobRepository,
    @Inject('ProductResearchMaterializationRepository')
    private readonly materializationRepository?: ProductResearchMaterializationRepository
  ) {}

  validateReviewedInput(input: ReviewedProductDraftInput): ReviewedProductDraftInput {
    const name = clean(input.name);
    const summary = clean(input.summary);
    const slug = input.slug.trim().toLowerCase();
    const logo = httpsUrl(input.logoUrl);
    const official = httpsUrl(input.officialUrl);
    if (!name || name.length > MAX_NAME_CHARS) {
      throw productInvalidArgs('서비스 이름을 확인해 주세요.');
    }
    if (!summary || summary.length > MAX_SUMMARY_CHARS) {
      throw productInvalidArgs('요약은 255자 이내로 입력해 주세요.');
    }
    if (!SAFE_SLUG.test(slug) || slug.length > MAX_SLUG_CHARS) {
      throw productInvalidArgs('slug 형식이 유효하지 않습니다.');
    }
    if (!logo) {
      throw productInvalidArgs('로고 URL이 유효하지 않습니다.');
    }
    if (!official) {
      throw productInvalidArgs('공식 URL이 유효하지 않습니다.');
    }
    if (input.categoryIds.length === 0) {
      throw productInvalidArgs('카테고리를 1개 이상 선택해 주세요.');
    }
    if (input.features.length > MAX_FEATURES) {
      throw productInvalidArgs('기능은 최대 8개까지 입력할 수 있습니다.');
    }
    const features = input.features.map((feature, index) => {
      const featureName = clean(feature.name);
      const featureSummary = clean(feature.summary);
      if (!featureName || !featureSummary) {
        throw productInvalidArgs(`features[${index}]를 확인해 주세요.`);
      }
      return { name: featureName.slice(0, 80), summary: featureSummary.slice(0, 300), emoji: feature.emoji || '✨' };
    });
    const seenTags = new Set<string>();
    const tags: string[] = [];
    for (const tag of input.tags) {
      const normalized = clean(tag);
      if (!normalized || normalized.length > 30) {
        throw productInvalidArgs('태그를 확인해 주세요.');
      }
      const key = normalized.toLowerCase();
      if (seenTags.has(key)) {
        continue;
      }
      seenTags.add(key);
      tags.push(normalized);
      if (tags.length >= MAX_TAGS) {
        break;
      }
    }
    return {
      researchJobId: input.researchJobId,
      name,
      slug,
      summary,
      logoUrl: logo,
      officialUrl: official,
      categoryIds: [...new Set(input.categoryIds)],
      features,
      tags,
    };
  }

  async getJob(jobId: string): Promise<import('@darun/products-domain').ProductResearchJobEntity | null> {
    if (!this.jobRepository) {
      return null;
    }
    return this.jobRepository.findById(jobId);
  }

  async materializeReviewedProduct(input: ReviewedProductDraftInput) {
    if (!this.jobRepository || !this.materializationRepository) {
      throw productInvalidArgs('리서치 저장소가 설정되지 않았습니다.');
    }
    const validated = this.validateReviewedInput(input);
    const job = await this.jobRepository.findById(validated.researchJobId);
    if (!job) {
      throw productInvalidArgs('존재하지 않는 조사 작업입니다.');
    }
    if (job.status !== 'completed' || !job.result) {
      throw productInvalidArgs('완료된 조사 작업만 적용할 수 있습니다.');
    }
    if (job.materializedProductId) {
      throw productSlugAlreadyExists();
    }
    const draft: ProductResearchDraftV1 = job.result;
    if (
      draft.originalUrl !== validated.officialUrl &&
      new URL(draft.originalUrl).hostname !== new URL(validated.officialUrl).hostname
    ) {
      throw productInvalidArgs('공식 URL 호스트가 조사 결과와 다릅니다.');
    }
    return this.materializationRepository.materialize(validated);
  }
}
