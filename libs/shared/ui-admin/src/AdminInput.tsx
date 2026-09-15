import { cn } from '@darun/ui';
import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef, useId } from 'react';
import { adminInputBaseClasses } from './lib/inputBase';

export interface AdminInputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const AdminInput = forwardRef<HTMLInputElement, AdminInputProps>(({ id, className, ...props }, ref) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <input
      ref={ref}
      id={inputId}
      className={cn(`${adminInputBaseClasses} placeholder:text-dark-400`, className)}
      {...props}
    />
  );
});
AdminInput.displayName = 'AdminInput';

export interface AdminTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const AdminTextarea = forwardRef<HTMLTextAreaElement, AdminTextareaProps>(({ id, className, ...props }, ref) => {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <textarea
      ref={ref}
      id={textareaId}
      className={cn(`${adminInputBaseClasses} placeholder:text-dark-400`, className)}
      {...props}
    />
  );
});
AdminTextarea.displayName = 'AdminTextarea';
