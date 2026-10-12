'use client';

import { gql } from '@apollo/client';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import { Button } from '@darun/ui';
import {
  AdminActions,
  AdminField,
  AdminInput,
  AdminPanel,
  AdminSectionBody,
  AdminSectionHeader,
} from '@darun/ui-admin';
import { Link, useNavigate } from '@darun/utils-router';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useRef, useState } from 'react';

const REQUEST_PRODUCT_RESEARCH = gql`
  mutation RequestProductResearchOnAdminResearch($input: RequestProductResearchInput!) {
    requestProductResearch(input: $input) {
      id
      officialUrl
      status
      errorCode
      errorMessage
    }
  }
`;

const RETRY_PRODUCT_RESEARCH = gql`
  mutation RetryProductResearchOnAdminResearch($jobId: String!) {
    retryProductResearch(jobId: $jobId) {
      id
      officialUrl
      status
      errorCode
      errorMessage
    }
  }
`;

const PRODUCT_RESEARCH_JOB = gql`
  query ProductResearchJobOnAdminResearch($id: String!) {
    productResearchJob(id: $id) {
      id
      status
      stage
      errorCode
      errorMessage
      officialUrl
      materializedProductId
      result {
        originalUrl
        name {
          value
          evidenceType
          anchors {
            sourceId
            excerpt
          }
        }
        suggestedSlug
        summary {
          value
          evidenceType
          anchors {
            sourceId
            excerpt
          }
        }
        features {
          name
          summary
          emoji
          evidenceType
          anchors {
            sourceId
            excerpt
          }
        }
        tags
        warnings
        sources {
          id
          title
          url
          hostname
          relationToInput
        }
      }
    }
  }
`;

const MATERIALIZE_RESEARCHED_PRODUCT = gql`
  mutation MaterializeResearchedProductOnAdminResearch($input: MaterializeResearchedProductInput!) {
    materializeResearchedProduct(input: $input) {
      id
      slug
    }
  }
`;

const CATEGORIES_FOR_RESEARCH = gql`
  query CategoriesOnAdminResearch($first: Int!, $locale: String!) {
    categories(first: $first, locale: $locale) {
      id
      slug
      labelKo
    }
  }
`;

const POLL_INTERVAL_MS = 2_500;
const MAX_POLL_ATTEMPTS = 72;

type ResearchAnchor = { sourceId: string; excerpt: string };
type ResearchText = { value: string; evidenceType?: string | null; anchors?: ResearchAnchor[] | null };
type ResearchFeature = {
  name: string;
  summary: string;
  emoji?: string | null;
  evidenceType?: string | null;
  anchors?: ResearchAnchor[] | null;
};
type ResearchSource = {
  id: string;
  title: string;
  url: string;
  hostname?: string | null;
  relationToInput?: string | null;
};
type ResearchResult = {
  originalUrl: string;
  suggestedSlug?: string | null;
  name?: ResearchText | null;
  summary?: ResearchText | null;
  features?: ResearchFeature[] | null;
  tags?: string[] | null;
  warnings?: string[] | null;
  sources?: ResearchSource[] | null;
};
type ResearchJob = {
  id: string;
  status: string;
  stage?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  officialUrl?: string | null;
  materializedProductId?: string | null;
  result?: ResearchResult | null;
};

type CategoryOption = { id: string; slug: string; labelKo: string };

function sourceTitleById(sources: ResearchSource[] | null | undefined, sourceId: string): string | null {
  const found = (sources ?? []).find(source => source.id === sourceId);
  return found ? found.title : null;
}

function anchorLabels(
  sources: ResearchSource[] | null | undefined,
  anchors: ResearchAnchor[] | null | undefined
): string[] {
  return (anchors ?? [])
    .map(anchor => sourceTitleById(sources, anchor.sourceId) ?? anchor.sourceId)
    .filter((label, index, all) => label.trim().length > 0 && all.indexOf(label) === index)
    .slice(0, 3);
}

export const ProductResearchSection = () => {
  const navigate = useNavigate();
  const [officialUrl, setOfficialUrl] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobIdInput, setJobIdInput] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ code?: string | null; message?: string | null } | null>(null);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [materializedProductId, setMaterializedProductId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [requestResearch, { loading, error }] = useMutation<
    { requestProductResearch?: ResearchJob },
    { input: { officialUrl: string } }
  >(REQUEST_PRODUCT_RESEARCH);
  const [retryResearch, { loading: retrying }] = useMutation<
    { retryProductResearch?: ResearchJob | null },
    { jobId: string }
  >(RETRY_PRODUCT_RESEARCH);
  const [materialize, { loading: materializing }] = useMutation<
    { materializeResearchedProduct?: { id: string; slug: string } },
    {
      input: {
        researchJobId: string;
        name: string;
        slug: string;
        summary: string;
        logoUrl: string;
        officialUrl: string;
        categoryIds: string[];
        features: { name: string; summary: string; emoji?: string }[];
        tags: string[];
      };
    }
  >(MATERIALIZE_RESEARCHED_PRODUCT);
  const [fetchJob, { loading: jobLoading }] = useLazyQuery<{ productResearchJob?: ResearchJob | null }, { id: string }>(
    PRODUCT_RESEARCH_JOB,
    { fetchPolicy: 'network-only' }
  );
  const { data: categoryData } = useQuery<{ categories?: CategoryOption[] }, { first: number; locale: string }>(
    CATEGORIES_FOR_RESEARCH,
    { variables: { first: 100, locale: 'ko' } }
  );
  const [prefill, setPrefill] = useState({
    name: '',
    slug: '',
    summary: '',
    logoUrl: '',
    officialUrl: '',
    categoryIds: '',
    tags: '',
  });
  const updatePrefill = (key: keyof typeof prefill) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value;
    setPrefill(current => ({ ...current, [key]: value }));
  };
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    setPolling(false);
  }, []);

  useEffect(() => {
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
      }
    };
  }, []);

  const applyJobToState = useCallback(
    (job: ResearchJob | null | undefined) => {
      if (!job) {
        return 'missing' as const;
      }
      setJobId(job.id);
      setStatus(job.status);
      setStage(job.stage ?? null);
      setFailure(job.status === 'failed' ? { code: job.errorCode ?? null, message: job.errorMessage ?? null } : null);
      setResult(job.result ?? null);
      setMaterializedProductId(job.materializedProductId ?? null);
      if (job.status === 'completed' || job.status === 'failed') {
        stopPolling();
        if (job.status === 'completed' && job.result) {
          setPrefill(current => ({
            name: current.name || job.result?.name?.value || '',
            slug: current.slug || job.result?.suggestedSlug || '',
            summary: current.summary || job.result?.summary?.value || '',
            logoUrl: current.logoUrl,
            officialUrl: current.officialUrl || job.result?.originalUrl || job.officialUrl || '',
            categoryIds: current.categoryIds,
            tags: current.tags || (job.result?.tags ?? []).join(', '),
          }));
        }
        return job.status;
      }
      return job.status;
    },
    [stopPolling]
  );

  const pollJob = useCallback(
    async (id: string) => {
      let attempts = 0;
      stopPolling();
      setPolling(true);
      const tick = async () => {
        attempts += 1;
        try {
          const response = await fetchJob({ variables: { id } });
          const next = applyJobToState(response.data?.productResearchJob);
          if (next === 'completed' || next === 'failed' || next === 'missing' || attempts >= MAX_POLL_ATTEMPTS) {
            stopPolling();
          }
        } catch (fetchError) {
          if (attempts >= MAX_POLL_ATTEMPTS) {
            stopPolling();
            notifications.show({
              title: '조사 조회 실패',
              message: fetchError instanceof Error ? fetchError.message : '조사 결과를 조회하지 못했습니다.',
              color: 'red',
            });
          }
        }
      };
      await tick();
      pollTimer.current = setInterval(() => {
        void tick();
      }, POLL_INTERVAL_MS);
    },
    [applyJobToState, fetchJob, stopPolling]
  );

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await requestResearch({ variables: { input: { officialUrl: officialUrl.trim() } } });
    const job = response.data?.requestProductResearch;
    if (job?.id) {
      setJobId(job.id);
      setResult(null);
      setMaterializedProductId(null);
      setFailure(null);
      await pollJob(job.id);
    }
  };

  const handleRefresh = async () => {
    if (!jobId) {
      return;
    }
    const response = await fetchJob({ variables: { id: jobId } });
    applyJobToState(response.data?.productResearchJob);
  };

  const handleRetry = async () => {
    if (!jobId) {
      return;
    }
    const response = await retryResearch({ variables: { jobId } });
    const job = response.data?.retryProductResearch;
    if (job?.id) {
      setResult(job.id === jobId ? result : null);
      await pollJob(job.id);
    }
  };

  const handleOpenJob = async (event: React.FormEvent) => {
    event.preventDefault();
    const id = jobIdInput.trim();
    if (!id) {
      return;
    }
    const response = await fetchJob({ variables: { id } });
    const job = response.data?.productResearchJob;
    if (!job) {
      notifications.show({ title: '작업 없음', message: '해당 ID의 조사 작업을 찾지 못했습니다.', color: 'red' });
      return;
    }
    const next = applyJobToState(job);
    if (next !== 'completed' && next !== 'failed') {
      await pollJob(job.id);
    }
  };

  const handleMaterialize = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!jobId) {
      return;
    }
    const features = (result?.features ?? []).slice(0, 8).map(feature => ({
      name: feature.name,
      summary: feature.summary,
      emoji: feature.emoji || '✨',
    }));
    try {
      const response = await materialize({
        variables: {
          input: {
            researchJobId: jobId,
            name: prefill.name.trim(),
            slug: prefill.slug.trim().toLowerCase(),
            summary: prefill.summary.trim(),
            logoUrl: prefill.logoUrl.trim(),
            officialUrl: prefill.officialUrl.trim() || result?.originalUrl || officialUrl.trim(),
            categoryIds: prefill.categoryIds
              .split(',')
              .map(value => value.trim())
              .filter(Boolean),
            features,
            tags: prefill.tags
              .split(',')
              .map(value => value.trim())
              .filter(Boolean),
          },
        },
      });
      const slug = response.data?.materializeResearchedProduct?.slug;
      if (slug) {
        notifications.show({
          title: '미발행 상품 생성',
          message: '검토 내용을 미발행 상품으로 저장했습니다.',
          color: 'teal',
        });
        navigate(`/products/${encodeURIComponent(slug)}`);
      }
    } catch (materializeError) {
      notifications.show({
        title: '미발행 상품 생성 실패',
        message: materializeError instanceof Error ? materializeError.message : '미발행 상품을 만들지 못했습니다.',
        color: 'red',
      });
    }
  };

  const sources = result?.sources ?? [];
  const categories = categoryData?.categories ?? [];
  const isTerminal = status === 'completed' || status === 'failed';
  const showProgress = Boolean(jobId) && Boolean(status) && !isTerminal;

  return (
    <AdminPanel>
      <AdminSectionHeader title="URL로 서비스 조사" />
      <AdminSectionBody>
        <form onSubmit={handleRequest} className="flex flex-col gap-3">
          <AdminField label="공식 사이트 URL" error={error?.message}>
            <AdminInput
              name="officialUrl"
              value={officialUrl}
              onChange={event => setOfficialUrl(event.currentTarget.value)}
              placeholder="ex) https://linear.app"
              disabled={loading || polling}
            />
          </AdminField>
          <AdminActions>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading || polling || !officialUrl.trim()}
            >
              {loading ? '조사 요청 중...' : polling ? '조사 진행 중...' : '조사 요청'}
            </Button>
            {jobId && (
              <Button
                type="button"
                variant="contained"
                color="secondary"
                disabled={jobLoading}
                onClick={() => void handleRefresh()}
              >
                {jobLoading ? '새로고침 중...' : '결과 새로고침'}
              </Button>
            )}
            {status === 'failed' && (
              <Button
                type="button"
                variant="contained"
                color="secondary"
                disabled={retrying}
                onClick={() => void handleRetry()}
              >
                {retrying ? '재시도 중...' : '실패 재시도'}
              </Button>
            )}
          </AdminActions>
        </form>

        <form onSubmit={handleOpenJob} className="flex flex-col gap-2 rounded-lg border border-dark-200 p-3">
          <span className="text-xs font-semibold text-dark-700">작업 ID로 다시 열기</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <AdminInput
              name="researchJobId"
              value={jobIdInput}
              onChange={event => setJobIdInput(event.currentTarget.value)}
              placeholder="조사 작업 ID 입력"
              disabled={jobLoading}
            />
            <Button type="submit" variant="contained" color="secondary" disabled={jobLoading || !jobIdInput.trim()}>
              작업 열기
            </Button>
          </div>
        </form>

        {jobId && <p className="text-xs text-dark-500">작업 ID: {jobId}</p>}
        {showProgress && (
          <p className="text-xs text-brown-700" role="status">
            조사 진행 중{stage ? ` · 단계: ${stage}` : ''} · 잠시 후 자동으로 갱신됩니다.
            {polling ? ' 진행 상태를 주기적으로 조회하고 있습니다.' : ''}
          </p>
        )}
        {status === 'failed' && (
          <div className="rounded-lg border border-cherry-200 bg-cherry-50/60 p-3" role="alert">
            <p className="text-xs font-semibold text-cherry-800">조사가 실패했습니다.</p>
            <p className="mt-1 text-xs text-cherry-800">
              {failure?.code ? `[${failure.code}] ` : ''}
              {failure?.message || '원인을 확인한 뒤 실패 재시도를 눌러 주세요.'}
            </p>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-2 rounded-lg border border-dark-200 p-3">
            <p className="text-sm font-semibold">{result.name?.value}</p>
            {result.summary?.value && <p className="text-sm text-dark-600">{result.summary.value}</p>}
            <p className="text-xs text-dark-500">제안 slug: {result.suggestedSlug}</p>
            {(result.warnings?.length ?? 0) > 0 && (
              <p className="text-xs text-amber-700">주의: {(result.warnings ?? []).join(', ')}</p>
            )}
            {result.name?.anchors && (result.name.anchors.length ?? 0) > 0 && (
              <p className="text-xs text-dark-500">
                이름 근거: {anchorLabels(sources, result.name.anchors).join(' · ') || '근거 표시 없음'} (
                {result.name.evidenceType ?? 'NONE'})
              </p>
            )}
            {result.summary?.anchors && (result.summary.anchors.length ?? 0) > 0 && (
              <p className="text-xs text-dark-500">
                요약 근거: {anchorLabels(sources, result.summary.anchors).join(' · ') || '근거 표시 없음'} (
                {result.summary.evidenceType ?? 'NONE'})
              </p>
            )}
            <ul className="list-disc pl-5 text-xs text-dark-600">
              {(result.features ?? []).map(feature => (
                <li key={`${feature.name}-${feature.summary}`}>
                  <span className="font-medium">
                    {feature.emoji ? `${feature.emoji} ` : ''}
                    {feature.name}
                  </span>
                  <span> — {feature.summary}</span>
                  {(feature.anchors?.length ?? 0) > 0 && (
                    <span className="text-dark-500">
                      {' '}
                      [근거: {anchorLabels(sources, feature.anchors).join(' · ') ||
                        feature.anchors?.[0]?.sourceId} · {feature.evidenceType ?? 'NONE'}]
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <ul className="list-disc pl-5 text-xs text-dark-600">
              {sources.map(source => (
                <li key={source.id}>
                  <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                    {source.title}
                  </a>
                  <span className="text-dark-500">
                    {' '}
                    · {source.hostname ?? ''} · {source.relationToInput ?? 'EXTERNAL'}
                  </span>
                </li>
              ))}
            </ul>
            {materializedProductId && (
              <p className="text-xs text-dark-500">이미 미발행 상품으로 저장된 조사입니다: {materializedProductId}</p>
            )}
            <p className="text-xs text-dark-500">
              검토 후 아래 폼에서 미발행 상품으로 저장하세요. 자동 발행되지 않습니다.
            </p>
          </div>
        )}

        {result && status === 'completed' && (
          <form onSubmit={handleMaterialize} className="flex flex-col gap-3 rounded-lg border border-dark-200 p-3">
            <p className="text-sm font-semibold">검토 폼 사전 입력</p>
            <AdminField label="서비스 이름">
              <AdminInput name="materializeName" value={prefill.name} onChange={updatePrefill('name')} />
            </AdminField>
            <AdminField label="slug">
              <AdminInput name="materializeSlug" value={prefill.slug} onChange={updatePrefill('slug')} />
            </AdminField>
            <AdminField label="요약">
              <AdminInput name="materializeSummary" value={prefill.summary} onChange={updatePrefill('summary')} />
            </AdminField>
            <AdminField label="로고 URL">
              <AdminInput
                name="materializeLogoUrl"
                value={prefill.logoUrl}
                onChange={updatePrefill('logoUrl')}
                placeholder="https://..."
              />
            </AdminField>
            <AdminField label="공식 URL">
              <AdminInput
                name="materializeOfficialUrl"
                value={prefill.officialUrl}
                onChange={updatePrefill('officialUrl')}
              />
            </AdminField>
            <AdminField
              label="카테고리 ID (쉼표 구분)"
              help={categories.map(item => `${item.labelKo}(${item.id})`).join(' · ') || undefined}
            >
              <AdminInput
                name="materializeCategoryIds"
                value={prefill.categoryIds}
                onChange={updatePrefill('categoryIds')}
                placeholder="카테고리 ID 입력"
              />
            </AdminField>
            <AdminField label="태그 (쉼표 구분)">
              <AdminInput name="materializeTags" value={prefill.tags} onChange={updatePrefill('tags')} />
            </AdminField>
            <AdminActions>
              <Button type="submit" variant="contained" color="primary" disabled={materializing}>
                {materializing ? '저장 중...' : '미발행 상품으로 저장'}
              </Button>
              {materializedProductId && (
                <Button as={Link} href="/products" variant="contained" color="secondary">
                  상품 목록으로 이동
                </Button>
              )}
            </AdminActions>
          </form>
        )}
      </AdminSectionBody>
    </AdminPanel>
  );
};
