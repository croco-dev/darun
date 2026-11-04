import {
  ProductResearchJobRepositoryToken,
  ProductResearchMaterializationRepositoryToken,
  type ProductResearchJobRepository,
  type ProductResearchMaterializationRepository,
  type ReviewedResearchFeature,
  productInvalidArgs,
} from '@darun/products-domain';
import {
  PRODUCT_RESEARCH_FEATURE_SUMMARY_MAX_LENGTH,
  PRODUCT_RESEARCH_MAX_TAGS,
  normalizeResearchFeatureSummary,
  normalizeResearchTags,
} from '@darun/products-domain/research';
import { Inject, Service } from 'typedi';

export type ReviewedProductDraftInput = {
  researchJobId: string;
  name: string;
  slug: string;
  summary: string;
  logoUrl: string;
  officialUrl: string;
  officialUrlConfirmed: boolean;
  categoryIds: string[];
  features: ReviewedResearchFeature[];
  tags: string[];
};

const MAX_SUMMARY_CHARS = 255;
const MAX_SLUG_CHARS = 100;
const MAX_PRODUCT_NAME_CHARS = 255;
const MAX_LOGO_URL_CHARS = 255;
const MAX_LINK_URL_CHARS = 255;
const MAX_LINK_TITLE_CHARS = 255;
const MAX_LINK_DISPLAY_CHARS = 100;
const MAX_FEATURE_NAME_CHARS = 100;
const MAX_FEATURE_EMOJI_CHARS = 30;
const MAX_TAG_NAME_CHARS = 100;
const MAX_FEATURES = 8;
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
    @Inject(ProductResearchJobRepositoryToken)
    private readonly jobRepository?: ProductResearchJobRepository,
    @Inject(ProductResearchMaterializationRepositoryToken)
    private readonly materializationRepository?: ProductResearchMaterializationRepository
  ) {}

  validateReviewedInput(input: ReviewedProductDraftInput): ReviewedProductDraftInput {
    const name = clean(input.name);
    const summary = clean(input.summary);
    const slug = input.slug.trim().toLowerCase();
    const logo = httpsUrl(input.logoUrl);
    const official = httpsUrl(input.officialUrl);
    if (!name || name.length > MAX_PRODUCT_NAME_CHARS) {
      throw productInvalidArgs('서비스 이름을 확인해 주세요.');
    }
    if (!summary || summary.length > MAX_SUMMARY_CHARS) {
      throw productInvalidArgs('요약은 255자 이내로 입력해 주세요.');
    }
    if (!SAFE_SLUG.test(slug) || slug.length > MAX_SLUG_CHARS) {
      throw productInvalidArgs('slug 형식이 유효하지 않습니다.');
    }
    if (!logo || logo.length > MAX_LOGO_URL_CHARS) {
      throw productInvalidArgs('로고 URL이 유효하지 않습니다.');
    }
    if (!official || official.length > MAX_LINK_URL_CHARS) {
      throw productInvalidArgs('공식 URL이 유효하지 않습니다.');
    }
    const linkTitle = `${name} 공식 사이트`;
    if (linkTitle.length > MAX_LINK_TITLE_CHARS) {
      throw productInvalidArgs('서비스 이름이 길어 공식 링크 제목을 만들 수 없습니다.');
    }
    const displayLink = new URL(official).hostname.toLowerCase();
    if (!displayLink || displayLink.length > MAX_LINK_DISPLAY_CHARS) {
      throw productInvalidArgs('공식 URL이 유효하지 않습니다.');
    }
    if (input.features.length > MAX_FEATURES) {
      throw productInvalidArgs('기능은 최대 8개까지 입력할 수 있습니다.');
    }
    const features = input.features.map((feature, index) => {
      const featureName = clean(feature.name);
      const featureSummary = normalizeResearchFeatureSummary(feature.summary);
      const emoji = (feature.emoji || '✨').trim() || '✨';
      if (
        !featureName ||
        featureName.length > MAX_FEATURE_NAME_CHARS ||
        !featureSummary ||
        emoji.length > MAX_FEATURE_EMOJI_CHARS
      ) {
        throw productInvalidArgs(`features[${index}]를 확인해 주세요.`);
      }
      if (featureSummary.length > PRODUCT_RESEARCH_FEATURE_SUMMARY_MAX_LENGTH) {
        throw productInvalidArgs(
          `기능 ${index + 1} 요약은 ${PRODUCT_RESEARCH_FEATURE_SUMMARY_MAX_LENGTH}자 이내로 입력해 주세요. 현재 ${featureSummary.length}자, ${featureSummary.length - PRODUCT_RESEARCH_FEATURE_SUMMARY_MAX_LENGTH}자 초과입니다.`
        );
      }
      return { name: featureName, summary: featureSummary, emoji };
    });
    for (const tag of input.tags) {
      const normalized = clean(tag);
      if (!normalized || normalized.length > MAX_TAG_NAME_CHARS) {
        throw productInvalidArgs('태그를 확인해 주세요.');
      }
    }
    const tags = normalizeResearchTags(input.tags);
    if (tags.length > PRODUCT_RESEARCH_MAX_TAGS) {
      throw productInvalidArgs(`태그는 최대 ${PRODUCT_RESEARCH_MAX_TAGS}개까지 입력할 수 있습니다.`);
    }
    return {
      researchJobId: input.researchJobId,
      name,
      slug,
      summary,
      logoUrl: logo,
      officialUrl: official,
      officialUrlConfirmed: input.officialUrlConfirmed,
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
    return this.materializationRepository.materialize(validated);
  }
}
