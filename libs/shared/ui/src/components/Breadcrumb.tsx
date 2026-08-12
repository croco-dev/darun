import { HTMLAttributes, ReactNode } from 'react';

import { Link } from '@darun/utils-router';
import { cn } from '../lib/utils';

export type BreadcrumbItem = {
  label: ReactNode;
  href?: string;
  ariaCurrent?: 'page';
};

export type BreadcrumbProps = HTMLAttributes<HTMLElement> & {
  items: BreadcrumbItem[];
  testId?: string;
};

export function Breadcrumb({ items, testId, className, ...props }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1', className)} {...props} data-testid={testId}>
      <ol className="flex items-center gap-1 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={String(index)} className="flex items-center gap-1">
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-dark-600 hover:text-dark-900 hover:underline focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
                  {...(item.ariaCurrent && {
                    'aria-current': item.ariaCurrent,
                  })}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="text-dark-900"
                  {...(item.ariaCurrent && {
                    'aria-current': item.ariaCurrent,
                  })}
                >
                  {item.label}
                </span>
              )}
              {!isLast && <span className="text-dark-500">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
