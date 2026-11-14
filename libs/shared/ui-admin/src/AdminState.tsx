'use client';

import { CombinedGraphQLErrors, ServerError, ServerParseError } from '@apollo/client/errors';
import { cn } from '@darun/ui';
import { type ReactNode, useEffect, useState } from 'react';

type AdminStateProps = {
  title?: string;
  description?: string;
  className?: string;
};

export type ParsedErrorInfo = {
  summary: string;
  technicalDetails?: string;
  statusCode?: number;
};

function isTimeoutError(err: unknown): boolean {
  if (!err || typeof err !== 'object') {
    return false;
  }
  const e = err as { name?: string; message?: string; networkError?: unknown };
  if (e.name === 'TimeoutError') {
    return true;
  }
  if (typeof e.message === 'string') {
    const lower = e.message.toLowerCase();
    if (lower.includes('timed out') || lower.includes('timeout')) {
      return true;
    }
  }
  if (e.networkError) {
    return isTimeoutError(e.networkError);
  }
  return false;
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') {
    return false;
  }
  const e = err as { name?: string; message?: string; networkError?: unknown };
  if (e.name === 'AbortError') {
    return true;
  }
  if (typeof e.message === 'string') {
    const lower = e.message.toLowerCase();
    if (lower.includes('aborted')) {
      return true;
    }
  }
  if (e.networkError) {
    return isAbortError(e.networkError);
  }
  return false;
}

export function parseErrorInfo(error: unknown): ParsedErrorInfo {
  if (!error) {
    return { summary: '일시적인 오류가 발생했습니다. 다시 시도해 주세요.' };
  }

  if (typeof error === 'string') {
    return { summary: error, technicalDetails: error };
  }

  const err = error as Record<string, unknown>;
  const combinedGraphQLError = CombinedGraphQLErrors.is(error) ? error : undefined;
  const graphQLErrors =
    combinedGraphQLError?.errors ??
    (Array.isArray(err['graphQLErrors']) ? (err['graphQLErrors'] as Record<string, unknown>[]) : []);
  const httpError = ServerError.is(error) || ServerParseError.is(error) ? error : undefined;
  const networkError = err['networkError'] as Record<string, unknown> | undefined;

  let statusCode: number | undefined;
  let serverResult: unknown;
  let summary = '';

  if (httpError) {
    statusCode = httpError.statusCode;
  } else if (networkError) {
    if (typeof networkError['statusCode'] === 'number') {
      statusCode = networkError['statusCode'];
    }
    serverResult = networkError['result'];
  }

  // Prioritize GraphQL business errors when transport didn't fail
  if (ServerParseError.is(httpError)) {
    summary = `서버 응답을 읽을 수 없습니다 (HTTP ${httpError.statusCode}).`;
  } else if (combinedGraphQLError) {
    summary = combinedGraphQLError.message;
  } else if (graphQLErrors.length > 0 && !networkError && !httpError) {
    summary = graphQLErrors.map(e => (typeof e['message'] === 'string' ? e['message'] : 'GraphQL Error')).join('\n');
  } else if (!httpError && isTimeoutError(error)) {
    summary = '요청 시간이 초과되었습니다. 네트워크 연결 또는 서버 상태를 확인해 주세요.';
  } else if (!httpError && isAbortError(error)) {
    summary = '요청이 중단되었습니다.';
  }

  if (!summary && (httpError || networkError)) {
    if (serverResult && typeof serverResult === 'object') {
      const res = serverResult as Record<string, unknown>;
      if (typeof res['message'] === 'string' && res['message']) {
        summary = `서버 오류 (HTTP ${statusCode ?? 500}): ${res['message']}`;
      } else if (Array.isArray(res['errors']) && res['errors'].length > 0) {
        summary = res['errors']
          .map((e: unknown) =>
            typeof e === 'object' && e && 'message' in e
              ? String((e as { message: unknown }).message)
              : JSON.stringify(e)
          )
          .join('\n');
      }
    }

    if (!summary && statusCode) {
      if (statusCode === 500) {
        summary = '서버 내부 오류 (HTTP 500): 서버에서 요청을 처리하지 못했습니다.';
      } else if (statusCode === 401) {
        summary = '인증 오류 (HTTP 401): 로그인이 필요하거나 세션이 만료되었습니다.';
      } else if (statusCode === 403) {
        summary = '권한 오류 (HTTP 403): 접근 권한이 없습니다.';
      } else if (statusCode === 404) {
        summary = '요청 실패 (HTTP 404): 요청한 리소스를 찾을 수 없습니다.';
      } else {
        summary = `서버 응답 오류 (HTTP ${statusCode})`;
      }
    } else if (!summary && typeof networkError?.['message'] === 'string') {
      summary = networkError['message'];
    }
  }

  if (!summary && !combinedGraphQLError && graphQLErrors.length > 0) {
    summary = graphQLErrors.map(e => (typeof e['message'] === 'string' ? e['message'] : 'GraphQL Error')).join('\n');
  }

  if (!summary && typeof err['message'] === 'string' && err['message']) {
    summary = err['message'];
  }

  if (!summary) {
    summary = '일시적인 오류가 발생했습니다. 다시 시도해 주세요.';
  }

  const detailsObj: Record<string, unknown> = {};
  if (err['name']) detailsObj['name'] = err['name'];
  if (err['message']) detailsObj['message'] = err['message'];
  if (statusCode !== undefined) detailsObj['statusCode'] = statusCode;
  if (serverResult !== undefined) detailsObj['serverResult'] = serverResult;
  if (httpError) detailsObj['bodyText'] = httpError.bodyText;
  if (graphQLErrors.length > 0) detailsObj['graphQLErrors'] = graphQLErrors;
  if (networkError) {
    detailsObj['networkError'] = {
      name: networkError['name'],
      message: networkError['message'],
      statusCode: networkError['statusCode'],
      result: networkError['result'],
    };
  }
  if (err['stack']) detailsObj['stack'] = err['stack'];

  let technicalDetails: string | undefined;
  try {
    technicalDetails = JSON.stringify(detailsObj, null, 2);
  } catch {
    technicalDetails = String(error);
  }

  return { summary, technicalDetails, statusCode };
}

export function AdminLoadingState({
  title = '불러오는 중...',
  description = '잠시만 기다려 주세요.',
  className,
}: AdminStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center p-8 min-h-52', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-500 shadow-2xs">
        <svg
          className="animate-spin motion-reduce:animate-none h-6 w-6 text-dark-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-dark-900">{title}</h3>
      {description && <p className="text-xs text-dark-500 mt-1">{description}</p>}
    </div>
  );
}

type AdminEmptyStateProps = AdminStateProps & {
  icon?: ReactNode;
  action?: ReactNode;
};

export function AdminEmptyState({
  title = '데이터가 없습니다.',
  description,
  icon,
  action,
  className,
}: AdminEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center p-8 min-h-52', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-500 shadow-2xs">
        {icon ?? (
          <svg
            className="h-6 w-6 shrink-0 text-dark-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.008 1.24l.885 1.77a2.25 2.25 0 0 0 2.007 1.24h1.98a2.25 2.25 0 0 0 2.007-1.24l.885-1.77a2.25 2.25 0 0 1 2.007-1.24h3.86m-18 0h18a2.25 2.25 0 0 1 2.25 2.25v4.5A2.25 2.25 0 0 1 22.5 21h-21A2.25 2.25 0 0 1 1.5 18.75v-4.5A2.25 2.25 0 0 1 2.25 13.5Z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5" />
          </svg>
        )}
      </div>
      <h3 className="text-sm font-semibold text-dark-800 break-words [word-break:keep-all]">{title}</h3>
      {description && <p className="text-xs text-dark-500 mt-1 break-words [word-break:keep-all]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

type AdminErrorStateProps = AdminStateProps & {
  action?: ReactNode;
  error?: unknown;
  details?: ReactNode | string;
};

export function AdminErrorState({
  title = '문제가 발생했습니다.',
  description,
  error,
  details,
  action,
  className,
}: AdminErrorStateProps) {
  const parsed = error ? parseErrorInfo(error) : undefined;
  const finalDescription = description ?? parsed?.summary ?? '잠시 후 다시 시도해 주세요.';
  const technicalContent = details ?? parsed?.technicalDetails;
  const copyText = typeof technicalContent === 'string' ? technicalContent : undefined;
  const [copy, setCopy] = useState<{
    text: string | undefined;
    attempt: number;
    status: 'idle' | 'pending' | 'copied' | 'failed';
  }>({ text: copyText, attempt: 0, status: 'idle' });

  if (copy.text !== copyText) {
    setCopy({ text: copyText, attempt: copy.attempt, status: 'idle' });
  }

  useEffect(() => {
    if (copy.status !== 'copied') return;
    const timer = setTimeout(
      () => setCopy(current => (current === copy ? { ...current, status: 'idle' } : current)),
      2000
    );
    return () => clearTimeout(timer);
  }, [copy]);

  const handleCopy = async () => {
    if (copyText === undefined || copy.status === 'pending') return;
    const pending = { text: copyText, attempt: copy.attempt + 1, status: 'pending' } as const;
    setCopy(pending);
    let status: 'copied' | 'failed';
    try {
      await navigator.clipboard.writeText(copyText);
      status = 'copied';
    } catch {
      status = 'failed';
    }
    setCopy(current => (current === pending ? { ...pending, status } : current));
  };

  return (
    <div
      className={cn('flex flex-col items-center justify-center text-center p-8 min-h-52 max-w-xl mx-auto', className)}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-cherry-200 bg-cherry-50 text-cherry-600 shadow-2xs">
        <svg
          className="h-6 w-6 shrink-0 text-cherry-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-cherry-700 break-words [word-break:keep-all]">{title}</h3>
      {finalDescription && (
        <p className="text-xs text-dark-500 mt-1 whitespace-pre-wrap break-words [word-break:keep-all]">
          {finalDescription}
        </p>
      )}

      {technicalContent && (
        <details className="mt-4 w-full text-left text-xs bg-surface-100 border border-dark-200 rounded-lg p-3 group">
          <summary className="cursor-pointer font-medium text-dark-700 hover:text-dark-900 select-none flex items-center justify-between">
            <span>자세한 오류 정보 확인</span>
            <span className="text-2xs text-dark-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="mt-2 pt-2 border-t border-dark-200/60 flex flex-col gap-2">
            {typeof technicalContent === 'string' && (
              <>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleCopy}
                    aria-disabled={copy.status === 'pending'}
                    className="text-2xs px-2 py-0.5 rounded border border-dark-200 bg-white hover:bg-surface-200 text-dark-700 transition active:scale-95 motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/40"
                  >
                    {copy.status === 'copied' ? '복사 완료!' : '오류 내용 복사'}
                  </button>
                </div>
                <output className={copy.status === 'failed' ? 'text-cherry-700' : 'sr-only'}>
                  {copy.status === 'failed' && (
                    <span key={copy.attempt}>복사하지 못했어요. 아래 오류 텍스트를 선택해 직접 복사해 주세요.</span>
                  )}
                </output>
              </>
            )}
            {typeof technicalContent === 'string' ? (
              <pre className="max-h-48 overflow-auto font-mono text-2xs text-dark-700 p-2 bg-white rounded border border-dark-150 whitespace-pre-wrap break-all">
                {technicalContent}
              </pre>
            ) : (
              technicalContent
            )}
          </div>
        </details>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
