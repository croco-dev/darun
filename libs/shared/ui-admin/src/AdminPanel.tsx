import { cn } from '@darun/ui';
import { ReactNode } from 'react';

type AdminPanelProps = { children: ReactNode; className?: string };

export function AdminPanel({ children, className }: AdminPanelProps) {
  return <div className={cn('rounded-card border border-dark-200 bg-white shadow-card', className)}>{children}</div>;
}
