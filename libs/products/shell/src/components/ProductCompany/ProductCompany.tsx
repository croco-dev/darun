'use client';

import { bind } from '@darun/utils-structure-react';
import { useTranslations } from 'next-intl';
import { useProductCompany } from './useProductCompany';

type ProductCompanyViewProps = {
  company: ReturnType<typeof useProductCompany>['company'];
};

function formatStartAt(startAt: unknown) {
  if (!startAt) {
    return '-';
  }

  if (typeof startAt !== 'string' && typeof startAt !== 'number' && !(startAt instanceof Date)) {
    return '-';
  }

  const date = startAt instanceof Date ? startAt : new Date(startAt);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}. ${month}. ${day}`;
}

export const ProductCompany = bind(useProductCompany, ({ company }: ProductCompanyViewProps) => {
  const t = useTranslations('ProductDetail');
  const hasAnyInfo = Boolean(company?.name || company?.type || company?.address || company?.startAt);

  if (!hasAnyInfo) {
    return (
      <div className="flex min-h-24 flex-col items-center justify-center rounded-xl border border-dashed border-dark-200 bg-surface-100/40 px-4 py-6 text-center">
        <p className="text-sm font-medium text-dark-500 break-keep">{t('company.empty')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-bold uppercase tracking-wider text-dark-400">{t('company.basicInfo')}</p>
      <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
        {company?.name && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dark-150/70 bg-surface-100/50 px-4 py-3">
            <dt className="shrink-0 text-xs font-semibold uppercase tracking-wider text-dark-500">
              {t('company.field.name')}
            </dt>
            <dd className="text-right text-sm font-semibold text-dark-900 break-keep">{company.name}</dd>
          </div>
        )}
        {company?.type && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dark-150/70 bg-surface-100/50 px-4 py-3">
            <dt className="shrink-0 text-xs font-semibold uppercase tracking-wider text-dark-500">
              {t('company.field.status')}
            </dt>
            <dd className="text-right text-sm font-semibold text-dark-900 break-keep">{company.type}</dd>
          </div>
        )}
        {company?.address && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dark-150/70 bg-surface-100/50 px-4 py-3">
            <dt className="shrink-0 text-xs font-semibold uppercase tracking-wider text-dark-500">
              {t('company.field.address')}
            </dt>
            <dd className="text-right text-sm font-semibold text-dark-900 break-keep">{company.address}</dd>
          </div>
        )}
        {company?.startAt && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dark-150/70 bg-surface-100/50 px-4 py-3">
            <dt className="shrink-0 text-xs font-semibold uppercase tracking-wider text-dark-500">
              {t('company.field.foundedAt')}
            </dt>
            <dd className="text-right text-sm font-semibold text-dark-900 break-keep">
              {formatStartAt(company.startAt)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
});
