import { cn } from '@darun/ui';
import { Children, ReactElement, ReactNode, cloneElement, isValidElement, useId } from 'react';
import { AdminInput, AdminTextarea } from './AdminInput';
import { AdminSelect } from './AdminSelect';

type AdminFieldProps = {
  label?: ReactNode;
  htmlFor?: string;
  error?: ReactNode;
  help?: ReactNode;
  children: ReactNode;
  className?: string;
};

function connectFieldControls(children: ReactNode, initialInputId: string, help: ReactNode, error: ReactNode) {
  let inputId = initialInputId;
  let connected = false;
  const connectControl = (nodes: ReactNode): ReactNode =>
    Children.map(nodes, node => {
      if (!isValidElement(node) || connected) return node;
      const element = node as ReactElement<Record<string, unknown>>;
      const props = element.props;
      if (
        ['input', 'textarea', 'select'].includes(element.type as string) ||
        element.type === AdminInput ||
        element.type === AdminTextarea ||
        element.type === AdminSelect
      ) {
        connected = true;
        inputId = (props.id as string | undefined) ?? inputId;
        const describedBy =
          [props['aria-describedby'], help ? `${inputId}-help` : '', error ? `${inputId}-error` : '']
            .filter(Boolean)
            .join(' ') || undefined;
        return cloneElement(element, {
          id: inputId,
          'aria-describedby': describedBy,
          ...(error ? { 'aria-invalid': true } : {}),
        });
      }
      return props.children ? cloneElement(element, { children: connectControl(props.children as ReactNode) }) : node;
    });
  const enhancedChild = connectControl(children);
  return { inputId, enhancedChild };
}

export function AdminField({ label, htmlFor, error, help, children, className }: AdminFieldProps) {
  const autoId = useId();
  const { inputId, enhancedChild } = connectFieldControls(children, htmlFor ?? autoId, help, error);

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
        <p id={`${inputId}-error`} role="alert" className="text-xs text-cherry-700 break-words [word-break:keep-all]">
          {error}
        </p>
      )}
    </div>
  );
}
