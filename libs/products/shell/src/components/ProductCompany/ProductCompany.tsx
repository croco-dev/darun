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

  const labelClassName = 'w-[76px] shrink-0 text-sm font-medium tabular-nums text-dark-600';
  const valueClassName = 'text-sm font-medium text-dark-800';

  return (
    <div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="mb-2 flex w-fit flex-col gap-1">
            <p className="text-sm font-semibold text-dark-900">{t('company.basicInfo')}</p>
            <div className="h-[2px] w-full rounded-full bg-dark-400" />
          </div>
          <div className="flex flex-col gap-2">
            {company?.name && (
              <div className="flex">
                <p className={labelClassName}>{t('company.field.name')}</p>
                <p className={valueClassName}>{company.name}</p>
              </div>
            )}
            {company?.type && (
              <div className="flex">
                <p className={labelClassName}>{t('company.field.status')}</p>
                <p className={valueClassName}>{company.type}</p>
              </div>
            )}
            {company?.address && (
              <div className="flex">
                <p className={labelClassName}>{t('company.field.address')}</p>
                <p className={valueClassName}>{company.address}</p>
              </div>
            )}
            {company?.startAt && (
              <div className="flex">
                <p className={labelClassName}>{t('company.field.foundedAt')}</p>
                <p className={valueClassName}>{formatStartAt(company.startAt)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
