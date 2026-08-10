import { cn } from '@darun/ui';
import { ReactNode } from 'react';

type AdminStateProps = {
  title?: string;
  description?: string;
  className?: string;
};

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
};

export function AdminErrorState({
  title = '문제가 발생했습니다.',
  description = '잠시 후 다시 시도해 주세요.',
  action,
  className,
}: AdminErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center p-8 min-h-52', className)}>
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
      {description && <p className="text-xs text-dark-500 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
