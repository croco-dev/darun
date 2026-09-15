import { cn } from '@darun/ui';
import { ReactNode, cloneElement, isValidElement, useId } from 'react';

type AdminFieldProps = {
  label?: ReactNode;
  htmlFor?: string;
  error?: ReactNode;
  help?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AdminField({ label, htmlFor, error, help, children, className }: AdminFieldProps) {
  const autoId = useId();
  const inputId = htmlFor ?? autoId;

  const describedBy =
    [help ? `${inputId}-help` : '', error ? `${inputId}-error` : ''].filter(Boolean).join(' ').trim() || undefined;

  const isSingleElement = isValidElement(children);
  const childProps = isSingleElement ? (children as React.ReactElement<Record<string, unknown>>).props || {} : {};
  const existingDescribedBy = childProps['aria-describedby'];
  const finalDescribedBy = existingDescribedBy ? `${existingDescribedBy} ${describedBy}` : describedBy;

  const enhancedChild = isSingleElement
    ? cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id: childProps['id'] ?? inputId,
        ...(describedBy ? { 'aria-describedby': finalDescribedBy } : {}),
      })
    : children;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-dark-900">
          {label}
        </label>
      )}
      {enhancedChild}
      {help && (
        <p id={`${inputId}-help`} className="text-xs text-dark-500">
          {help}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-cherry-700">
          {error}
        </p>
      )}
    </div>
  );
}
