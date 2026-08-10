import { ReactNode } from 'react';

type PageShellProps = {
  title: string;
  rightSide?: ReactNode;
  children: ReactNode;
  onBack?: () => void;
};

export function PageShell({ title, rightSide, children, onBack }: PageShellProps) {
  return (
    <div className="w-full p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center rounded-lg p-2 text-dark-500 hover:bg-dark-100 hover:text-dark-900 transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/40"
              aria-label="뒤로가기"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </button>
          ) : null}
          <h1 className="text-xl font-semibold tracking-tight text-dark-900">{title}</h1>
        </div>
        {rightSide ? <div className="shrink-0">{rightSide}</div> : null}
      </div>
      {children}
    </div>
  );
}
