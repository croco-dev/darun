'use client';

import { cn } from '@darun/ui';
import { type ReactNode, useState } from 'react';

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

export function parseErrorInfo(error: unknown): ParsedErrorInfo {
  if (!error) {
    return { summary: '일시적인 오류가 발생했습니다. 다시 시도해 주세요.' };
  }

  if (typeof error === 'string') {
    return { summary: error, technicalDetails: error };
  }

  const err = error as Record<string, unknown>;
  const graphQLErrors = Array.isArray(err['graphQLErrors']) ? (err['graphQLErrors'] as Record<string, unknown>[]) : [];
  const networkError = err['networkError'] as Record<string, unknown> | undefined;

  let statusCode: number | undefined;
  let serverResult: unknown;
  let summary = '';

  if (networkError) {
    if (typeof networkError['statusCode'] === 'number') {
      statusCode = networkError['statusCode'];
    }
    serverResult = networkError['result'];

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
    } else if (!summary && typeof networkError['message'] === 'string') {
      summary = networkError['message'];
    }
  }

  if (!summary && graphQLErrors.length > 0) {
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
      <svg
        className="animate-spin motion-reduce:animate-none h-8 w-8 text-dark-500 mb-3"
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
      <h3 className="text-sm font-medium text-dark-900">{title}</h3>
      {description && <p className="text-xs text-dark-500 mt-1">{description}</p>}
    </div>
  );
}

type AdminEmptyStateProps = AdminStateProps & {
  icon?: ReactNode;
};

export function AdminEmptyState({ title = '데이터가 없습니다.', description, icon, className }: AdminEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center p-8 min-h-52', className)}>
      {icon ?? (
        <svg
          className="h-8 w-8 text-dark-400 mb-3"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.008 1.24l.885 1.77a2.25 2.25 0 0 0 2.007 1.24h1.98a2.25 2.25 0 0 0 2.007-1.24l.885-1.77a2.25 2.25 0 0 1 2.007-1.24h3.86m-18 0h18a2.25 2.25 0 0 1 2.25 2.25v4.5A2.25 2.25 0 0 1 22.5 21h-21A2.25 2.25 0 0 1 1.5 18.75v-4.5A2.25 2.25 0 0 1 2.25 13.5Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5" />
        </svg>
      )}
      <h3 className="text-sm font-medium text-dark-500">{title}</h3>
      {description && <p className="text-xs text-dark-500 mt-1">{description}</p>}
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
  const [copied, setCopied] = useState(false);
  const parsed = error ? parseErrorInfo(error) : undefined;
  const finalDescription = description ?? parsed?.summary ?? '잠시 후 다시 시도해 주세요.';
  const technicalContent = details ?? parsed?.technicalDetails;

  const handleCopy = () => {
    if (typeof technicalContent === 'string' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(technicalContent)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          // ignore clipboard failure
        });
    }
  };

  return (
    <div
      className={cn('flex flex-col items-center justify-center text-center p-8 min-h-52 max-w-xl mx-auto', className)}
    >
      <svg
        className="h-8 w-8 text-cherry-700 mb-3"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
        />
      </svg>
      <h3 className="text-sm font-medium text-cherry-700">{title}</h3>
      {finalDescription && <p className="text-xs text-dark-500 mt-1 whitespace-pre-wrap">{finalDescription}</p>}

      {technicalContent && (
        <details className="mt-4 w-full text-left text-xs bg-surface-100 border border-dark-200 rounded-lg p-3 group">
          <summary className="cursor-pointer font-medium text-dark-700 hover:text-dark-900 select-none flex items-center justify-between">
            <span>자세한 오류 정보 확인</span>
            <span className="text-[10px] text-dark-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="mt-2 pt-2 border-t border-dark-200/60 flex flex-col gap-2">
            {typeof technicalContent === 'string' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-[11px] px-2 py-0.5 rounded border border-dark-200 bg-white hover:bg-surface-200 text-dark-700 transition"
                >
                  {copied ? '복사 완료!' : '오류 내용 복사'}
                </button>
              </div>
            )}
            {typeof technicalContent === 'string' ? (
              <pre className="max-h-48 overflow-auto font-mono text-[11px] text-dark-700 p-2 bg-white rounded border border-dark-150 whitespace-pre-wrap break-all">
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
