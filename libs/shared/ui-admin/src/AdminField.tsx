import { cn } from '@darun/ui';
import { Children, ReactNode, cloneElement, isValidElement, useId } from 'react';

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

  const child = Children.only(children) as React.ReactElement<Record<string, unknown>>;
  const enhancedChild = isValidElement(child)
    ? cloneElement(child, {
        id: inputId,
        ...(describedBy
          ? {
              'aria-describedby': child.props['aria-describedby']
                ? `${child.props['aria-describedby']} ${describedBy}`
                : describedBy,
            }
          : {}),
      })
    : child;

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
        <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
