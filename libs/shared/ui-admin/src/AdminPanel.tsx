import { cn } from '@darun/ui';
import { ReactNode } from 'react';

type AdminPanelProps = { children: ReactNode; className?: string };

export function AdminPanel({ children, className }: AdminPanelProps) {
  return <div className={cn('rounded-xl border border-dark-200 bg-white shadow-sm', className)}>{children}</div>;
}
