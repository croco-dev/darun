import { cn } from '@darun/ui';
import { ReactNode } from 'react';

type AdminActionsProps = {
  children: ReactNode;
  className?: string;
};

export function AdminActions({ children, className }: AdminActionsProps) {
  return <div className={cn('flex items-center justify-end gap-3 pt-4', className)}>{children}</div>;
}
