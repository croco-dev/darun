import { cn } from '@darun/ui';
import { SelectHTMLAttributes, forwardRef, useId } from 'react';
import { adminInputBaseClasses } from './lib/inputBase';

export interface AdminSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const AdminSelect = forwardRef<HTMLSelectElement, AdminSelectProps>(
  ({ id, className, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <select
        ref={ref}
        id={selectId}
        className={cn(`${adminInputBaseClasses} bg-white cursor-pointer disabled:cursor-not-allowed`, className)}
        {...props}
      >
        {children}
      </select>
    );
  }
);
AdminSelect.displayName = 'AdminSelect';
