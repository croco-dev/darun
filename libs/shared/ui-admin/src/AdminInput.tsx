import { cn } from '@darun/ui';
import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';

export interface AdminInputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const AdminInput = forwardRef<HTMLInputElement, AdminInputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-dark-200 px-3 py-2 text-sm text-dark-900 placeholder:text-dark-400 outline-none transition motion-reduce:transition-none focus:border-dark-900 focus-visible:ring-2 focus-visible:ring-dark-900/40 disabled:bg-dark-50 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});
AdminInput.displayName = 'AdminInput';

export interface AdminTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const AdminTextarea = forwardRef<HTMLTextAreaElement, AdminTextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-dark-200 px-3 py-2 text-sm text-dark-900 placeholder:text-dark-400 outline-none transition motion-reduce:transition-none focus:border-dark-900 focus-visible:ring-2 focus-visible:ring-dark-900/40 disabled:bg-dark-50 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});
AdminTextarea.displayName = 'AdminTextarea';
