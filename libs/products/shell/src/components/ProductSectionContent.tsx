'use client';

import { Button } from '@darun/ui';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

const panelClassName = 'rounded-card-lg border border-dark-150 bg-surface-50 px-4 py-5 text-sm text-dark-700 sm:px-5';

export function ProductSectionContent({
  error,
  refetch,
  children,
}: {
  error?: Error;
  refetch: () => Promise<unknown>;
  children: ReactNode;
}) {
  const t = useTranslations('ProductDetail.sectionStatus');
  if (!error) return children;

  return (
    <div className={`${panelClassName} flex flex-wrap items-center gap-x-4 gap-y-2`}>
      <p role="alert">{t('error')}</p>
      <Button
        type="button"
        size="sm"
        className="min-h-11 sm:min-h-0"
        onClick={event => {
          // Keep keyboard focus inside the section when the retry button is replaced by loading.
          event.currentTarget.closest<HTMLElement>('[tabindex="-1"]')?.focus({ preventScroll: true });
          // Apollo exposes a failed retry through the same query's error state.
          void refetch().catch(() => {});
        }}
      >
        {t('retry')}
      </Button>
    </div>
  );
}

export function ProductSectionLoading() {
  const t = useTranslations('ProductDetail.sectionStatus');
  return (
    <p role="status" className={panelClassName}>
      {t('loading')}
    </p>
  );
}

// Keep errored partial responses (including productBySlug: null) out of the cache used by the rest of the page.
export const productSectionQueryOptions = { errorPolicy: 'all', fetchPolicy: 'no-cache' } as const;
