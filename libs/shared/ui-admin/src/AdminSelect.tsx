import { cn } from '@darun/ui';
import { SelectHTMLAttributes, forwardRef } from 'react';
import { adminInputBaseClasses } from './lib/inputBase';

export interface AdminSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const AdminSelect = forwardRef<HTMLSelectElement, AdminSelectProps>(({ className, children, ...props }, ref) => {
  return (
    <select ref={ref} className={cn(`${adminInputBaseClasses} bg-white`, className)} {...props}>
      {children}
    </select>
  );
});
AdminSelect.displayName = 'AdminSelect';
