import { Link } from '@darun/utils-router';
import { HTMLAttributes, ReactNode } from 'react';

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
  ariaLabel?: string;
  locale?: string;
};

export function Breadcrumb({ items, testId, ariaLabel, locale, className, ...props }: BreadcrumbProps) {
  const resolvedTestId = testId ?? (props as { 'data-testid'?: string })['data-testid'];
  const defaultAriaLabel = locale === 'ko' ? '탐색 경로' : 'Breadcrumb';

  const validItems = items.filter(item => item.label !== undefined && item.label !== null && item.label !== '');

  return (
    <nav
      aria-label={ariaLabel ?? defaultAriaLabel}
      className={cn('flex items-center gap-1.5 text-xs sm:text-sm', className)}
      {...props}
      {...(resolvedTestId && { 'data-testid': resolvedTestId })}
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        {validItems.map((item, index) => {
          const isLast = index === validItems.length - 1;
          const currentAria = item.ariaCurrent ?? (isLast ? 'page' : undefined);

          return (
            <li key={String(index)} className="flex items-center gap-1.5">
              {item.href ? (
                <Link
                  href={item.href}
                  className="inline-flex min-h-[28px] sm:min-h-0 items-center max-w-[240px] truncate font-medium text-dark-600 transition-colors duration-150 motion-reduce:transition-none hover:text-dark-900 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 sm:max-w-md md:max-w-lg"
                  {...(currentAria && {
                    'aria-current': currentAria,
                  })}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="inline-flex min-h-[28px] sm:min-h-0 items-center max-w-[240px] truncate font-semibold text-dark-900 sm:max-w-md md:max-w-lg"
                  {...(currentAria && {
                    'aria-current': currentAria,
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
