'use client';

import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  GetProductDescriptionJobsOnAdminDocument,
  GetTranslationJobsOnAdminDocument,
  RetryProductDescriptionJobOnAdminDocument,
  RetryTranslationJobOnAdminDocument,
} from '@darun/provider-graphql';
import { Button } from '@darun/ui';
import { AdminEmptyState, AdminErrorState, AdminLoadingState, AdminModal, AdminPanel } from '@darun/ui-admin';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import { AlertCircle, CheckCircle2, Clock, Copy, Globe, Info, RefreshCw, RotateCw, Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query GetTranslationJobsOnAdmin($status: String, $limit: Int, $offset: Int) {
    translationJobs(status: $status, limit: $limit, offset: $offset) {
      id
      entityType
      entityId
      locale
      status
      message
      error
      createdAt
      updatedAt
    }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  mutation RetryTranslationJobOnAdmin($id: String!) {
    retryTranslationJob(id: $id) {
      id
      entityType
      entityId
      locale
      status
      message
      error
      createdAt
      updatedAt
    }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query GetProductDescriptionJobsOnAdmin($status: String, $limit: Int, $offset: Int) {
    productDescriptionJobs(status: $status, limit: $limit, offset: $offset) {
      id
      productId
      status
      message
      error
      createdAt
      updatedAt
    }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  mutation RetryProductDescriptionJobOnAdmin($id: String!) {
    retryProductDescriptionJob(id: $id) {
      id
      productId
      status
      message
      error
      createdAt
      updatedAt
    }
  }
`;

export type UnifiedLlmJob = {
  id: string;
  jobType: 'translation' | 'description';
  jobTypeLabel: string;
  entityType: string;
  entityId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | string;
  message?: string | null;
  error?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

const JOB_TYPE_FILTERS = [
  { value: 'all', label: '전체 작업' },
  { value: 'translation', label: '영문 번역' },
  { value: 'description', label: 'AI 소개 생성' },
] as const;

const STATUS_FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'failed', label: '실패' },
  { value: 'in_progress', label: '진행 중' },
  { value: 'pending', label: '대기 중' },
  { value: 'completed', label: '완료' },
] as const;

function formatDuration(status: string, createdAt?: string | Date | null, updatedAt?: string | Date | null) {
  if (status === 'pending' || status === 'in_progress') return '-';
  if (!createdAt || !updatedAt) return '-';
  const start = dayjs(createdAt);
  const end = dayjs(updatedAt);
  const diffSec = end.diff(start, 'second');
  if (diffSec < 0) return '-';
  if (diffSec < 60) return `${diffSec}초`;
  const diffMin = Math.floor(diffSec / 60);
  const remainSec = diffSec % 60;
  return `${diffMin}분 ${remainSec}초`;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={12} />
          대기 중
        </span>
      );
    case 'in_progress':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
          <RotateCw size={12} className="animate-spin" />
          진행 중
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={12} />
          완료
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          <AlertCircle size={12} />
          실패
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-dark-100 text-dark-700">
          {status}
        </span>
      );
  }
}

export function LlmJobListSection() {
  const [jobTypeFilter, setJobTypeFilter] = useState<'all' | 'translation' | 'description'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedErrorJob, setSelectedErrorJob] = useState<UnifiedLlmJob | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const queryVariables = {
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 50,
    offset: 0,
  };

  const {
    data: translationData,
    loading: translationLoading,
    error: translationError,
    refetch: refetchTranslation,
  } = useQuery(GetTranslationJobsOnAdminDocument, {
    variables: queryVariables,
    fetchPolicy: 'cache-and-network',
    skip: jobTypeFilter === 'description',
  });

  const {
    data: descriptionData,
    loading: descriptionLoading,
    error: descriptionError,
    refetch: refetchDescription,
  } = useQuery(GetProductDescriptionJobsOnAdminDocument, {
    variables: queryVariables,
    fetchPolicy: 'cache-and-network',
    skip: jobTypeFilter === 'translation',
  });

  const [retryTranslation] = useMutation(RetryTranslationJobOnAdminDocument);
  const [retryDescription] = useMutation(RetryProductDescriptionJobOnAdminDocument);

  const translationJobs: UnifiedLlmJob[] = (translationData?.translationJobs ?? []).map(j => ({
    id: j.id,
    jobType: 'translation',
    jobTypeLabel: j.entityType === 'Product' ? '상품 영문 번역' : `${j.entityType} 번역`,
    entityType: j.entityType,
    entityId: j.entityId,
    status: j.status,
    message: j.message,
    error: j.error,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
  }));

  const descriptionJobs: UnifiedLlmJob[] = (descriptionData?.productDescriptionJobs ?? []).map(j => ({
    id: j.id,
    jobType: 'description',
    jobTypeLabel: '상품 AI 소개 생성',
    entityType: 'Product',
    entityId: j.productId,
    status: j.status,
    message: j.message,
    error: j.error,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
  }));

  let jobs: UnifiedLlmJob[] = [];
  if (jobTypeFilter === 'translation') {
    jobs = translationJobs;
  } else if (jobTypeFilter === 'description') {
    jobs = descriptionJobs;
  } else {
    jobs = [...translationJobs, ...descriptionJobs].sort(
      (a, b) => (dayjs(b.createdAt).valueOf() || 0) - (dayjs(a.createdAt).valueOf() || 0)
    );
  }

  const isLoading =
    (translationLoading && translationJobs.length === 0) || (descriptionLoading && descriptionJobs.length === 0);
  const queryError = translationError || descriptionError;

  const refetchAll = async () => {
    const promises: Promise<unknown>[] = [];
    if (jobTypeFilter !== 'description') promises.push(refetchTranslation());
    if (jobTypeFilter !== 'translation') promises.push(refetchDescription());
    await Promise.all(promises);
  };

  // Auto-polling when active jobs exist
  const hasActiveJobs = jobs.some(j => j.status === 'pending' || j.status === 'in_progress');
  useEffect(() => {
    if (!hasActiveJobs) return;
    const timer = setInterval(() => {
      void refetchAll();
    }, 3000);
    return () => clearInterval(timer);
  }, [hasActiveJobs, jobTypeFilter]);

  const handleRetry = async (job: UnifiedLlmJob) => {
    try {
      setRetryingId(job.id);
      if (job.jobType === 'translation') {
        await retryTranslation({
          variables: { id: job.id },
        });
      } else {
        await retryDescription({
          variables: { id: job.id },
        });
      }
      notifications.show({
        title: '재시도 요청 성공',
        message: '작업이 대기열에 다시 등록되었습니다.',
        color: 'teal',
      });
      await refetchAll();
    } catch (err) {
      notifications.show({
        title: '재시도 요청 실패',
        message: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
        color: 'red',
      });
    } finally {
      setRetryingId(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    notifications.show({
      message: `${label} 복사되었습니다.`,
      color: 'dark',
    });
  };

  if (isLoading && jobs.length === 0) {
    return <AdminLoadingState />;
  }

  if (queryError && jobs.length === 0) {
    return (
      <AdminErrorState
        error={queryError}
        action={
          <Button type="button" onClick={() => void refetchAll()} variant="contained" color="primary">
            다시 시도
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header controls: Job Types + Status Filters + Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-dark-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Job Type Selector */}
          <div className="flex items-center gap-1 bg-surface-100 p-1 rounded-lg border border-dark-150">
            {JOB_TYPE_FILTERS.map(typeFilter => {
              const isActive = jobTypeFilter === typeFilter.value;
              return (
                <button
                  key={typeFilter.value}
                  type="button"
                  onClick={() => setJobTypeFilter(typeFilter.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer select-none ${
                    isActive ? 'bg-white text-dark-900 shadow-xs' : 'text-dark-500 hover:text-dark-800'
                  }`}
                >
                  {typeFilter.label}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-dark-200 hidden sm:block" />

          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map(filter => {
              const isActive = statusFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer select-none ${
                    isActive
                      ? 'bg-dark-900 text-white font-semibold shadow-xs'
                      : 'text-dark-600 hover:bg-surface-100 hover:text-dark-900'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveJobs && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              <RotateCw size={12} className="animate-spin" />
              실시간 갱신 중
            </span>
          )}
          <Button
            type="button"
            variant="base"
            color="secondary"
            onClick={() => void refetchAll()}
            className="flex items-center gap-1.5 py-1.5 px-3 text-xs"
          >
            <RefreshCw size={13} className={translationLoading || descriptionLoading ? 'animate-spin' : ''} />
            새로고침
          </Button>
        </div>
      </div>

      {/* Jobs table */}
      {jobs.length === 0 ? (
        <AdminPanel className="p-12">
          <AdminEmptyState
            title="등록된 LLM 작업이 없습니다."
            description={
              statusFilter !== 'all'
                ? `'${STATUS_FILTERS.find(f => f.value === statusFilter)?.label}' 상태인 작업이 없습니다.`
                : '서비스 편집 페이지 등에서 영문 번역이나 AI 소개 생성을 요청하면 작업이 등록됩니다.'
            }
          />
        </AdminPanel>
      ) : (
        <AdminPanel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse table-fixed">
              <thead className="bg-surface-100">
                <tr>
                  <th className="border-b border-r border-dark-200 px-4 py-3 text-left text-xs font-semibold text-dark-700 w-24">
                    작업 ID
                  </th>
                  <th className="border-b border-r border-dark-200 px-4 py-3 text-left text-xs font-semibold text-dark-700 w-36">
                    작업 유형
                  </th>
                  <th className="border-b border-r border-dark-200 px-4 py-3 text-left text-xs font-semibold text-dark-700 w-36">
                    대상 엔티티
                  </th>
                  <th className="border-b border-r border-dark-200 px-4 py-3 text-left text-xs font-semibold text-dark-700 w-28">
                    상태
                  </th>
                  <th className="border-b border-r border-dark-200 px-4 py-3 text-left text-xs font-semibold text-dark-700 min-w-[200px]">
                    메시지 / 에러
                  </th>
                  <th className="border-b border-r border-dark-200 px-4 py-3 text-left text-xs font-semibold text-dark-700 w-36">
                    요청 일시
                  </th>
                  <th className="border-b border-r border-dark-200 px-4 py-3 text-left text-xs font-semibold text-dark-700 w-24">
                    소요 시간
                  </th>
                  <th className="border-b border-dark-200 px-4 py-3 text-center text-xs font-semibold text-dark-700 w-24">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, index) => {
                  const isRetrying = retryingId === job.id;
                  const hasError = Boolean(job.error);

                  return (
                    <tr
                      key={`${job.jobType}-${job.id}`}
                      className={`border-b border-dark-200 transition hover:bg-surface-50 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-surface-100/40'
                      }`}
                    >
                      {/* ID */}
                      <td className="border-r border-dark-200 px-4 py-3 text-xs font-mono text-dark-800">
                        <div className="flex items-center gap-1" title={job.id}>
                          <span>{job.id.slice(0, 8)}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(job.id, '작업 ID가')}
                            className="text-dark-400 hover:text-dark-700 transition"
                            title="전체 ID 복사"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="border-r border-dark-200 px-4 py-3 text-xs text-dark-800 font-medium">
                        <div className="flex items-center gap-1.5">
                          {job.jobType === 'translation' ? (
                            <Globe size={13} className="text-teal-600 shrink-0" />
                          ) : (
                            <Sparkles size={13} className="text-amber-500 shrink-0" />
                          )}
                          <span className="truncate">{job.jobTypeLabel}</span>
                        </div>
                      </td>

                      {/* Entity ID */}
                      <td className="border-r border-dark-200 px-4 py-3 text-xs font-mono text-dark-600 truncate">
                        <div className="flex items-center gap-1" title={`${job.entityType}: ${job.entityId}`}>
                          <span className="truncate">{job.entityId}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(job.entityId, '엔티티 ID가')}
                            className="text-dark-400 hover:text-dark-700 transition shrink-0"
                            title="엔티티 ID 복사"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="border-r border-dark-200 px-4 py-3 text-xs">
                        <StatusBadge status={job.status} />
                      </td>

                      {/* Message / Error */}
                      <td className="border-r border-dark-200 px-4 py-3 text-xs">
                        {hasError ? (
                          <div className="flex items-start gap-1.5">
                            <span
                              className="text-red-600 font-medium line-clamp-2 cursor-pointer hover:underline"
                              onClick={() => setSelectedErrorJob(job)}
                              title="클릭하여 상세 에러 확인"
                            >
                              {job.error}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedErrorJob(job)}
                              className="text-red-500 hover:text-red-700 shrink-0 mt-0.5"
                              title="에러 상세 보기"
                            >
                              <Info size={13} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-dark-600 line-clamp-1">{job.message || '-'}</span>
                        )}
                      </td>

                      {/* Requested At */}
                      <td className="border-r border-dark-200 px-4 py-3 text-xs text-dark-600 whitespace-nowrap">
                        {job.createdAt ? dayjs(job.createdAt).format('YY-MM-DD HH:mm:ss') : '-'}
                      </td>

                      {/* Duration */}
                      <td className="border-r border-dark-200 px-4 py-3 text-xs text-dark-600 whitespace-nowrap font-mono">
                        {formatDuration(job.status, job.createdAt, job.updatedAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center text-xs">
                        {job.status === 'failed' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="base"
                            color="secondary"
                            onClick={() => void handleRetry(job)}
                            disabled={isRetrying}
                            className="inline-flex items-center gap-1 py-1 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 font-semibold"
                          >
                            <RotateCw size={11} className={isRetrying ? 'animate-spin' : ''} />
                            재시도
                          </Button>
                        ) : job.status === 'pending' || job.status === 'in_progress' ? (
                          <span className="text-xs text-blue-600 font-medium">처리 중</span>
                        ) : (
                          <span className="text-xs text-dark-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      )}

      {/* Error Details Modal */}
      {selectedErrorJob && (
        <AdminModal
          opened={Boolean(selectedErrorJob)}
          onClose={() => setSelectedErrorJob(null)}
          title="LLM 작업 에러 상세"
          maxWidth="max-w-2xl"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between bg-surface-100 p-3 rounded-lg border border-dark-200 text-xs">
              <div className="flex gap-4">
                <div>
                  <span className="text-dark-500">작업 ID: </span>
                  <span className="font-mono font-semibold text-dark-900">{selectedErrorJob.id}</span>
                </div>
                <div>
                  <span className="text-dark-500">작업 유형: </span>
                  <span className="font-semibold text-dark-900">{selectedErrorJob.jobTypeLabel}</span>
                </div>
              </div>
              <div>
                <span className="text-dark-500">{selectedErrorJob.entityType} ID: </span>
                <span className="font-mono font-semibold text-dark-900">{selectedErrorJob.entityId}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-dark-700">에러 메시지</span>
              <pre className="p-3 bg-red-50/60 border border-red-200 rounded-lg text-xs text-red-800 font-mono whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
                {selectedErrorJob.error || '에러 내용이 없습니다.'}
              </pre>
            </div>

            {selectedErrorJob.message && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-dark-700">상태 메시지</span>
                <p className="text-xs text-dark-600">{selectedErrorJob.message}</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-dark-200">
              <Button
                type="button"
                variant="base"
                color="secondary"
                size="sm"
                onClick={() => copyToClipboard(selectedErrorJob.error || '', '에러 내용이')}
                className="flex items-center gap-1.5"
              >
                <Copy size={13} />
                에러 복사
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="base"
                  color="secondary"
                  size="sm"
                  onClick={() => setSelectedErrorJob(null)}
                >
                  닫기
                </Button>
                {selectedErrorJob.status === 'failed' && (
                  <Button
                    type="button"
                    variant="contained"
                    color="primary"
                    size="sm"
                    onClick={() => {
                      const job = selectedErrorJob;
                      setSelectedErrorJob(null);
                      void handleRetry(job);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <RotateCw size={13} />
                    지금 재시도
                  </Button>
                )}
              </div>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
