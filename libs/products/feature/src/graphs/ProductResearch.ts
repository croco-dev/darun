import {
  type ProductResearchDraftV1,
  type ProductResearchJobEntity,
  type ResearchAnchor,
  type ResearchEvidenceType,
  type ResearchRelationToInput,
  type ResearchSource,
  type ResearchText,
} from '@darun/products-domain';
import { Field, GraphQLISODateTime, ID, InputType, Int, ObjectType } from 'type-graphql';

@ObjectType('ResearchAnchorGraph')
export class ResearchAnchorGraph {
  @Field()
  sourceId: string;

  @Field()
  excerpt: string;
}

@ObjectType('ResearchTextGraph')
export class ResearchTextGraph {
  @Field()
  value: string;

  @Field(() => [ResearchAnchorGraph])
  anchors: ResearchAnchorGraph[];

  @Field()
  evidenceType: string;
}

@ObjectType('ResearchSourceGraph')
export class ResearchSourceGraph {
  @Field()
  id: string;

  @Field()
  title: string;

  @Field()
  url: string;

  @Field()
  hostname: string;

  @Field()
  snippet: string;

  @Field(() => [String])
  extraSnippets: string[];

  @Field()
  relationToInput: string;
}

@ObjectType('ResearchFeatureGraph')
export class ResearchFeatureGraph {
  @Field()
  name: string;

  @Field()
  summary: string;

  @Field()
  emoji: string;

  @Field(() => [ResearchAnchorGraph])
  anchors: ResearchAnchorGraph[];

  @Field()
  evidenceType: string;
}

@ObjectType('ResearchCandidateGraph')
export class ResearchCandidateGraph {
  @Field()
  name: string;

  @Field(() => String, { nullable: true })
  website?: string | null;

  @Field(() => [ResearchAnchorGraph])
  anchors: ResearchAnchorGraph[];
}

@ObjectType('ResearchCategoryCandidateGraph')
export class ResearchCategoryCandidateGraph {
  @Field()
  categoryId: string;

  @Field()
  reason: string;
}

@ObjectType('ProductResearchDraftGraph')
export class ProductResearchDraftGraph {
  @Field(() => Int)
  version: number;

  @Field()
  originalUrl: string;

  @Field(() => ResearchTextGraph)
  name: ResearchTextGraph;

  @Field()
  suggestedSlug: string;

  @Field(() => ResearchTextGraph, { nullable: true })
  summary?: ResearchTextGraph | null;

  @Field(() => [ResearchFeatureGraph])
  features: ResearchFeatureGraph[];

  @Field(() => [String])
  tags: string[];

  @Field(() => [String])
  warnings: string[];

  @Field(() => [ResearchSourceGraph])
  sources: ResearchSourceGraph[];

  @Field(() => [ResearchCategoryCandidateGraph])
  categoryCandidates: ResearchCategoryCandidateGraph[];

  @Field(() => ResearchCandidateGraph, { nullable: true })
  companyCandidate?: ResearchCandidateGraph | null;

  @Field(() => [ResearchCandidateGraph])
  alternativeCandidates: ResearchCandidateGraph[];

  @Field()
  sourceSnapshotHash: string;

  @Field()
  promptVersion: string;

  @Field()
  model: string;
}

@ObjectType('ProductResearchJob')
export class ProductResearchJob {
  @Field(() => ID)
  id: string;

  @Field()
  requestKey: string;

  @Field()
  officialUrl: string;

  @Field()
  status: string;

  @Field(() => String, { nullable: true })
  dispatchStatus?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  runNotBefore?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  nextDispatchAt?: Date;

  @Field(() => String, { nullable: true })
  retryOfJobId?: string | null;

  @Field(() => String, { nullable: true })
  stage?: string | null;

  @Field(() => String, { nullable: true })
  errorCode?: string | null;

  @Field(() => String, { nullable: true })
  errorMessage?: string | null;

  @Field(() => ProductResearchDraftGraph, { nullable: true })
  result?: ProductResearchDraftGraph | null;

  @Field(() => String, { nullable: true })
  materializedProductId?: string | null;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

@InputType('RequestProductResearchInput')
export class RequestProductResearchInput {
  @Field()
  requestId: string;

  @Field()
  officialUrl: string;
}

@InputType('RetryProductResearchInput')
export class RetryProductResearchInput {
  @Field({ nullable: true })
  requestId?: string;
}

@InputType('ReviewedResearchFeatureInput')
export class ReviewedResearchFeatureInput {
  @Field()
  name: string;

  @Field()
  summary: string;

  @Field({ nullable: true })
  emoji?: string;
}

@InputType('MaterializeResearchedProductInput')
export class MaterializeResearchedProductInput {
  @Field()
  researchJobId: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field()
  summary: string;

  @Field()
  logoUrl: string;

  @Field()
  officialUrl: string;

  @Field(() => Boolean)
  officialUrlConfirmed: boolean;

  @Field(() => [String])
  categoryIds: string[];

  @Field(() => [ReviewedResearchFeatureInput])
  features: ReviewedResearchFeatureInput[];

  @Field(() => [String])
  tags: string[];
}

function toAnchorGraph(anchor: ResearchAnchor): ResearchAnchorGraph {
  return { sourceId: anchor.sourceId, excerpt: anchor.excerpt };
}

function toTextGraph(text: ResearchText): ResearchTextGraph {
  return {
    value: text.value,
    anchors: text.anchors.map(toAnchorGraph),
    evidenceType: text.evidenceType as ResearchEvidenceType as string,
  };
}

function toSourceGraph(source: ResearchSource): ResearchSourceGraph {
  return {
    id: source.id,
    title: source.title,
    url: source.url,
    hostname: source.hostname,
    snippet: source.snippet,
    extraSnippets: source.extraSnippets,
    relationToInput: source.relationToInput as ResearchRelationToInput as string,
  };
}

function toCandidateGraph(
  candidate: {
    name: string;
    website?: string;
    anchors: ResearchAnchor[];
  } | null
): ResearchCandidateGraph | null {
  if (!candidate) {
    return null;
  }
  return {
    name: candidate.name,
    website: candidate.website ?? null,
    anchors: candidate.anchors.map(toAnchorGraph),
  };
}

export function toProductResearchJobGraph(job: ProductResearchJobEntity): ProductResearchJob {
  let result: ProductResearchDraftGraph | null = null;
  const draft: ProductResearchDraftV1 | null = job.result;
  if (draft) {
    result = {
      version: draft.version,
      originalUrl: draft.originalUrl,
      name: toTextGraph(draft.identity.name),
      suggestedSlug: draft.identity.suggestedSlug,
      summary: draft.summary ? toTextGraph(draft.summary) : null,
      features: draft.features.map(feature => ({
        name: feature.name,
        summary: feature.summary,
        emoji: feature.emoji,
        anchors: feature.anchors.map(toAnchorGraph),
        evidenceType: feature.evidenceType as string,
      })),
      tags: draft.tags,
      warnings: draft.warnings,
      sources: draft.sources.map(toSourceGraph),
      categoryCandidates: draft.categoryCandidates.map(candidate => ({
        categoryId: candidate.categoryId,
        reason: candidate.reason,
      })),
      companyCandidate: toCandidateGraph(draft.companyCandidate),
      alternativeCandidates: (draft.alternativeCandidates ?? []).map(candidate => ({
        name: candidate.name,
        website: candidate.website ?? null,
        anchors: candidate.anchors.map(toAnchorGraph),
      })),
      sourceSnapshotHash: draft.sourceSnapshotHash,
      promptVersion: draft.promptVersion,
      model: draft.model,
    };
  }
  return {
    id: job.id,
    requestKey: job.requestKey,
    officialUrl: job.officialUrl,
    status: job.status,
    dispatchStatus: job.dispatchStatus,
    runNotBefore: job.runNotBefore,
    nextDispatchAt: job.nextDispatchAt,
    retryOfJobId: job.retryOfJobId,
    stage: job.stage,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    result,
    materializedProductId: job.materializedProductId,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
