'use client';

import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { Button } from '@darun/ui';
import { AdminActions, AdminField, AdminInput, AdminPanel, AdminSectionBody, AdminSectionHeader } from '@darun/ui-admin';
import { useState } from 'react';

const REQUEST_PRODUCT_RESEARCH = gql`
  mutation RequestProductResearch($input: RequestProductResearchInput!) {
    requestProductResearch(input: $input) {
      id
      officialUrl
      status
      errorCode
      errorMessage
    }
  }
`;

const PRODUCT_RESEARCH_JOB = gql`
  query ProductResearchJob($id: ID!) {
    productResearchJob(id: $id) {
      id
      status
      errorCode
      errorMessage
      officialUrl
      result {
        originalUrl
        name {
          value
        }
        suggestedSlug
        summary {
          value
        }
        features {
          name
          summary
          emoji
        }
        tags
        warnings
        sources {
          id
          title
          url
          hostname
        }
      }
    }
  }
`;

export const ProductResearchSection = () => {
  const [officialUrl, setOfficialUrl] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [requestResearch, { loading, error }] = useMutation(REQUEST_PRODUCT_RESEARCH);
  const [fetchJob, { data, loading: jobLoading }] = useLazyQuery(PRODUCT_RESEARCH_JOB, {
    fetchPolicy: 'network-only',
  });

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await requestResearch({ variables: { input: { officialUrl } } });
    const job = response.data?.requestProductResearch;
    if (job?.id) {
      setJobId(job.id);
      await fetchJob({ variables: { id: job.id } });
    }
  };

  const result = data?.productResearchJob?.result;

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
              disabled={loading}
            />
          </AdminField>
          <AdminActions>
            <Button type="submit" variant="contained" color="primary" disabled={loading || !officialUrl.trim()}>
              {loading ? '조사 요청 중...' : '조사 요청'}
            </Button>
            {jobId && (
              <Button
                type="button"
                variant="contained"
                color="secondary"
                disabled={jobLoading}
                onClick={() => fetchJob({ variables: { id: jobId } })}
              >
                {jobLoading ? '새로고침 중...' : '결과 새로고침'}
              </Button>
            )}
          </AdminActions>
        </form>
        {jobId && <p className="text-xs text-dark-500">작업 ID: {jobId}</p>}
        {result && (
          <div className="flex flex-col gap-2 rounded-lg border border-dark-200 p-3">
            <p className="text-sm font-semibold">{result.name?.value}</p>
            {result.summary?.value && <p className="text-sm text-dark-600">{result.summary.value}</p>}
            <p className="text-xs text-dark-500">제안 slug: {result.suggestedSlug}</p>
            {result.warnings?.length > 0 && <p className="text-xs text-amber-700">주의: {result.warnings.join(', ')}</p>}
            <ul className="list-disc pl-5 text-xs text-dark-600">
              {result.sources?.map((source: { id: string; title: string; url: string }) => (
                <li key={source.id}>
                  <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-xs text-dark-500">검토 후 아래 수동 등록 폼에 복사해 저장하세요. 자동 발행되지 않습니다.</p>
          </div>
        )}
      </AdminSectionBody>
    </AdminPanel>
  );
};
