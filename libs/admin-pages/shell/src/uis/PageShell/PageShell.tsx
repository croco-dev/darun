import { ReactNode } from 'react';
import { ReactNode } from 'react';

type PageShellProps = {
  title?: string;
  rightSide?: ReactNode;
  children?: ReactNode;
};

export const PageShell = ({ title, rightSide, children }: PageShellProps) => (
  <div className="w-full p-5">
    <div className="flex flex-row justify-between">
      <h2 className="text-2xl font-semibold">
        {title}
      </h2>
      {rightSide}
    </div>
    {children}
  </div>
);
