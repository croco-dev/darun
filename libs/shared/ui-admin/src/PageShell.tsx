import type { ReactNode } from 'react';

type PageShellProps = {
  title: string;
  rightSide?: ReactNode;
  children: ReactNode;
};

export function PageShell({ title, rightSide, children }: PageShellProps) {
  return (
    <div className="w-full p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-[-0.2px]">{title}</h1>
        {rightSide ? <div className="shrink-0">{rightSide}</div> : null}
      </div>
      {children}
    </div>
  );
}
