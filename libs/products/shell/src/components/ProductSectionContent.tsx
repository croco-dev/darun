'use client';

import { Button } from '@darun/ui';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

const panelClassName = 'rounded-card-lg border border-dark-150 bg-surface-50 px-4 py-5 text-sm text-dark-700 sm:px-5';

export function ProductSectionContent({
  loading,
  error,
  refetch,
  children,
}: {
  loading: boolean;
  error?: Error;
  refetch: () => Promise<unknown>;
  children: ReactNode;
}) {
  if (loading) {
    return <ProductSectionStatus refetch={refetch} />;
  }

  if (error) {
    return <ProductSectionStatus failed refetch={refetch} />;
  }

  return children;
}

function ProductSectionStatus({ failed = false, refetch }: { failed?: boolean; refetch: () => Promise<unknown> }) {
  const t = useTranslations('ProductDetail.sectionStatus');
  if (!failed) {
    return (
      <p role="status" className={panelClassName}>
        {t('loading')}
      </p>
    );
  }

  return (
    <div className={`${panelClassName} flex flex-wrap items-center gap-x-4 gap-y-2`}>
      <p role="alert">{t('error')}</p>
      <Button
        type="button"
        size="sm"
        className="min-h-11 sm:min-h-0"
        onClick={event => {
          // Keep keyboard focus inside the section when the retry button is replaced by loading.
          event.currentTarget.closest('section')?.focus({ preventScroll: true });
          // Apollo exposes a failed retry through the same query's error state.
          void refetch().catch(() => {});
        }}
      >
        {t('retry')}
      </Button>
    </div>
  );
}
