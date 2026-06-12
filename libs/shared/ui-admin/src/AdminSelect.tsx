import { cn } from '@darun/ui';
import { SelectHTMLAttributes, forwardRef } from 'react';

export interface AdminSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const AdminSelect = forwardRef<HTMLSelectElement, AdminSelectProps>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-dark-200 bg-white px-3 py-2 text-sm text-dark-900 outline-none transition motion-reduce:transition-none focus:border-dark-900 focus-visible:ring-2 focus-visible:ring-dark-900/40 disabled:bg-dark-50 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
AdminSelect.displayName = 'AdminSelect';
