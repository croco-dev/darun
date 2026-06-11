import { cn } from '@darun/ui';
import { ReactNode } from 'react';

type AdminSectionProps = { children: ReactNode; className?: string };

export function AdminSection({ children, className }: AdminSectionProps) {
  return <div className={cn('flex flex-col', className)}>{children}</div>;
}

type AdminSectionHeaderProps = {
  title?: string;
  rightSide?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function AdminSectionHeader({ title, rightSide, children, className }: AdminSectionHeaderProps) {
  return (
    <div className={cn('border-b border-dark-200 px-5 py-3 flex items-center justify-between gap-4', className)}>
      {title ? <h2 className="text-sm font-medium text-dark-900">{title}</h2> : children}
      {rightSide && <div className="shrink-0">{rightSide}</div>}
    </div>
  );
}

type AdminSectionBodyProps = { children: ReactNode; className?: string };

export function AdminSectionBody({ children, className }: AdminSectionBodyProps) {
  return <div className={cn('px-5 py-4 flex flex-col gap-4', className)}>{children}</div>;
}
