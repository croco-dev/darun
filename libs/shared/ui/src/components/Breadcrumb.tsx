import { HTMLAttributes, ReactNode } from 'react';

import { Link } from '@darun/utils-router';
import { cn } from '../lib/utils';
import { ChevronRight } from './icons';

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
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1.5 text-xs sm:text-sm', className)}
      {...props}
      data-testid={testId}
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={String(index)} className="flex items-center gap-1.5">
              {item.href ? (
                <Link
                  href={item.href}
                  className="inline-block max-w-[160px] truncate align-bottom text-dark-500 transition-colors duration-150 hover:text-dark-900 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 sm:max-w-xs"
                  {...(item.ariaCurrent && {
                    'aria-current': item.ariaCurrent,
                  })}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="max-w-[200px] truncate font-semibold text-dark-900 sm:max-w-xs"
                  {...(item.ariaCurrent && {
                    'aria-current': item.ariaCurrent,
                  })}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight
                  size={12}
                  className="shrink-0 text-dark-400 stroke-[2.25] select-none"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
