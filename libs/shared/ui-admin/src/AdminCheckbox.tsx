import { cn } from '@darun/ui';
import { InputHTMLAttributes, forwardRef, useId } from 'react';

export interface AdminCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const AdminCheckbox = forwardRef<HTMLInputElement, AdminCheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          type="checkbox"
          id={inputId}
          className={cn(
            'h-4 w-4 rounded border-dark-200 text-dark-900 transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/40 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'text-sm font-medium text-dark-900 select-none',
              props.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            )}
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);
AdminCheckbox.displayName = 'AdminCheckbox';
