import { ProductContentSyncToken, type ProductContentSync } from '@darun/products-domain';
import { GetProduct, productInvalidArgs, type ProductDescriptionJobSummary } from '@darun/products-domain';
import { ProductDescriptionJobService, type ProductDescriptionJobStatus } from '@darun/products-service';
import { AuthRole, decodeTimestampCursor, encodeTimestampCursor } from '@darun/utils-apollo-server';
import { Arg, Authorized, Int, Query, Resolver, FieldResolver, Root } from 'type-graphql';
import { Inject, Service } from 'typedi';
import { ProductContentSyncOverview } from './graphs/IndexProduct';
import { ProductDescriptionJob } from './graphs/ProductDescriptionJob';
import { ProductDescriptionJobPage } from './graphs/ProductDescriptionJobPage';

function toGraphJob(job: ProductDescriptionJobSummary): ProductDescriptionJob {
  return {
    id: job.id,
    productId: job.productId,
    status: job.status,
    dispatchStatus: job.dispatchStatus,
    runNotBefore: job.runNotBefore,
    nextDispatchAt: job.nextDispatchAt,
    retryOfJobId: job.retryOfJobId ?? undefined,
    message: job.message ?? undefined,
    error: job.error ?? undefined,
    evidenceHash: job.evidenceHash ?? undefined,
    baseDescriptionHash: job.baseDescriptionHash ?? undefined,
    writerModel: job.writerModel ?? undefined,
    reviewerModel: job.reviewerModel ?? undefined,
    appliedAt: job.appliedAt ?? undefined,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

@Resolver(() => ProductDescriptionJob)
@Service()
export class ProductDescriptionQueryResolver {
  constructor(
    private readonly productDescriptionJobService: ProductDescriptionJobService,
    @Inject(ProductContentSyncToken)
    private readonly contentSync: ProductContentSync,
    private readonly getProduct: GetProduct
  ) {}

  @Authorized([AuthRole.Admin])
  @Query(() => ProductContentSyncOverview, {
    description:
      '관리자만 조회할 수 있는 Product별 최신 검색·번역 상태. 현재 전역 revision과 독립적으로 각 kind 최신 intent를 반환한다.',
  })
  productContentSyncStatus(@Arg('slug') slug: string): Promise<ProductContentSyncOverview> {
    return this.contentSync.latestStatus(slug);
  }

  @Authorized([AuthRole.Admin])
  @FieldResolver(() => String, {
    description: '후보가 소속된 Product의 현재 slug. 관리자 목록에서 descriptionJobId deep-link를 만드는 데 사용한다.',
  })
  async productSlug(@Root() job: ProductDescriptionJob): Promise<string> {
    // cache 없는 ID loader로 같은 tick을 묶고 다음 요청에서는 현재 commit된 slug를 읽는다.
    const product = await this.getProduct.execute({ id: job.productId });
    if (!product) throw new Error('소개 후보에 연결된 제품을 찾지 못했습니다.');
    return product.slug;
  }

  @Authorized([AuthRole.Admin])
  @FieldResolver(() => String, { nullable: true })
  candidateHtml(@Root() job: ProductDescriptionJob): string | null | Promise<string | null> {
    if (Object.prototype.hasOwnProperty.call(job, 'candidateHtml')) return job.candidateHtml ?? null;
    return this.productDescriptionJobService.getCandidateHtml(job.id);
  }

  @Authorized([AuthRole.Admin])
  @Query(() => ProductDescriptionJob, { nullable: true })
  async productDescriptionJob(@Arg('id') id: string): Promise<ProductDescriptionJob | null> {
    const job = await this.productDescriptionJobService.getJob(id);
    if (!job) {
      return null;
    }

    return {
      ...toGraphJob(job),
      candidateHtml: job.candidateHtml ?? undefined,
    };
  }

  @Authorized([AuthRole.Admin])
  @Query(() => [ProductDescriptionJob])
  async productDescriptionJobs(
    @Arg('status', () => String, { nullable: true }) status?: string,
    @Arg('limit', () => Int, { nullable: true }) limit?: number,
    @Arg('offset', () => Int, { nullable: true }) offset?: number
  ): Promise<ProductDescriptionJob[]> {
    const jobs = await this.productDescriptionJobService.getJobs({
      status: status as ProductDescriptionJobStatus | undefined,
      limit: limit ?? 50,
      offset: offset ?? 0,
    });

    return jobs.map(toGraphJob);
  }

  @Authorized([AuthRole.Admin])
  @Query(() => ProductDescriptionJobPage, { name: 'productDescriptionJobPage' })
  async productDescriptionJobPage(
    @Arg('status', () => String, { nullable: true }) status?: string,
    @Arg('first', () => Int, { nullable: true }) first?: number,
    @Arg('after', () => String, { nullable: true }) after?: string
  ): Promise<ProductDescriptionJobPage> {
    const limit = first ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw productInvalidArgs('한 번에 1~100개의 소개 생성 작업을 조회할 수 있습니다.');
    }
    let filter: ProductDescriptionJobStatus | undefined;
    switch (status) {
      case undefined:
      case null:
        break;
      case 'pending':
      case 'in_progress':
      case 'completed':
      case 'failed':
      case 'superseded':
        filter = status;
        break;
      default:
        throw productInvalidArgs('지원하지 않는 소개 생성 작업 상태입니다.');
    }
    const scope = 'productDescriptionJobPage:' + (filter ?? 'all');
    const position = after == null ? undefined : decodeTimestampCursor(scope, after);
    const { jobs, next } = await this.productDescriptionJobService.getJobPage({
      status: filter,
      limit,
      after: position,
    });
    return {
      jobs: jobs.map(toGraphJob),
      nextCursor: next && encodeTimestampCursor(scope, next),
    };
  }
}
