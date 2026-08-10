import { cn } from '@darun/ui';
import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';
import { adminInputBaseClasses } from './lib/inputBase';

export interface AdminInputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const AdminInput = forwardRef<HTMLInputElement, AdminInputProps>(({ className, ...props }, ref) => {
  return <input ref={ref} className={cn(`${adminInputBaseClasses} placeholder:text-dark-400`, className)} {...props} />;
});
AdminInput.displayName = 'AdminInput';

export interface AdminTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const AdminTextarea = forwardRef<HTMLTextAreaElement, AdminTextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea ref={ref} className={cn(`${adminInputBaseClasses} placeholder:text-dark-400`, className)} {...props} />
  );
});
AdminTextarea.displayName = 'AdminTextarea';
