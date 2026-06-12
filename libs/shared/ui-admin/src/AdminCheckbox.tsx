import { cn } from '@darun/ui';
import { InputHTMLAttributes, forwardRef } from 'react';

export interface AdminCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const AdminCheckbox = forwardRef<HTMLInputElement, AdminCheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          type="checkbox"
          id={id}
          className={cn(
            'h-4 w-4 rounded border-dark-200 text-dark-900 transition focus:ring-2 motion-reduce:transition-none focus:ring-dark-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/40 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-dark-900 select-none cursor-pointer">
            {label}
          </label>
        )}
      </div>
    );
  }
);
AdminCheckbox.displayName = 'AdminCheckbox';
