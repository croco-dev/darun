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

  const labelClassName = 'w-24 shrink-0 text-sm font-medium text-dark-500';
  const valueClassName = 'text-sm font-medium text-dark-800';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-dark-400">{t('company.basicInfo')}</p>
        <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-3">
          {company?.name && (
            <div className="flex items-baseline">
              <dt className={labelClassName}>{t('company.field.name')}</dt>
              <dd className={valueClassName}>{company.name}</dd>
            </div>
          )}
          {company?.type && (
            <div className="flex items-baseline">
              <dt className={labelClassName}>{t('company.field.status')}</dt>
              <dd className={valueClassName}>{company.type}</dd>
            </div>
          )}
          {company?.address && (
            <div className="flex items-baseline">
              <dt className={labelClassName}>{t('company.field.address')}</dt>
              <dd className={valueClassName}>{company.address}</dd>
            </div>
          )}
          {company?.startAt && (
            <div className="flex items-baseline">
              <dt className={labelClassName}>{t('company.field.foundedAt')}</dt>
              <dd className={valueClassName}>{formatStartAt(company.startAt)}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
});
