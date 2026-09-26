'use client';

import { bind } from '@darun/utils-structure-react';
import { Building2, Calendar, Compass, ShieldCheck } from '@darun/ui';
import { useLocale, useTranslations } from 'next-intl';
import { getLocalizedCompanyAddress, getLocalizedCompanyType } from '../../utils/localization';
import { useProductCompany } from './useProductCompany';

type ProductCompanyViewProps = {
  company: ReturnType<typeof useProductCompany>['company'];
};

function formatStartAt(startAt: unknown, locale = 'ko') {
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

  if (locale === 'en') {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}. ${month}. ${day}`;
}

export const ProductCompany = bind(useProductCompany, ({ company }: ProductCompanyViewProps) => {
  const t = useTranslations('ProductDetail');
  const locale = useLocale();
  const hasAnyInfo = Boolean(company?.name || company?.type || company?.address || company?.startAt);

  if (!hasAnyInfo) {
    return (
      <div className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-dark-200/80 bg-surface-50/50 px-6 py-10 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-500 shadow-2xs">
          <Building2 size={18} className="stroke-[2]" />
        </div>
        <p className="text-sm font-semibold text-dark-900 break-keep">{t('company.empty')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-card-lg border border-dark-150 bg-white p-5 shadow-card sm:p-6 md:p-8">
      <div className="flex flex-col gap-4">
        <p className="text-xs font-bold tracking-tight text-dark-500">{t('company.basicInfo')}</p>
        <dl className="grid grid-cols-1 divide-y divide-dark-100/80 sm:grid-cols-2 sm:divide-y-0 sm:gap-x-8 sm:gap-y-4">
          {company?.name && (
            <div className="flex items-center justify-between gap-4 py-3 sm:py-2">
              <div className="flex items-center gap-2 text-dark-500">
                <Building2 size={15} className="shrink-0 stroke-[1.75]" />
                <dt className="text-xs font-semibold text-dark-600">
                  {t('company.field.name')}
                </dt>
              </div>
              <dd className="text-right text-sm font-bold text-dark-900 break-keep">{company.name}</dd>
            </div>
          )}
          {company?.type && (
            <div className="flex items-center justify-between gap-4 py-3 sm:py-2">
              <div className="flex items-center gap-2 text-dark-500">
                <ShieldCheck size={15} className="shrink-0 stroke-[1.75]" />
                <dt className="text-xs font-semibold text-dark-600">
                  {t('company.field.status')}
                </dt>
              </div>
              <dd className="text-right text-sm font-bold text-dark-900 break-keep">
                {getLocalizedCompanyType(company.type, locale) ?? company.type}
              </dd>
            </div>
          )}
          {company?.address && (
            <div className="flex items-center justify-between gap-4 py-3 sm:py-2">
              <div className="flex items-center gap-2 text-dark-500">
                <Compass size={15} className="shrink-0 stroke-[1.75]" />
                <dt className="text-xs font-semibold text-dark-600">
                  {t('company.field.address')}
                </dt>
              </div>
              <dd className="text-right text-sm font-bold text-dark-900 break-keep">
                {getLocalizedCompanyAddress(company.address, locale) ?? company.address}
              </dd>
            </div>
          )}
          {company?.startAt && (
            <div className="flex items-center justify-between gap-4 py-3 sm:py-2">
              <div className="flex items-center gap-2 text-dark-500">
                <Calendar size={15} className="shrink-0 stroke-[1.75]" />
                <dt className="text-xs font-semibold text-dark-600">
                  {t('company.field.foundedAt')}
                </dt>
              </div>
              <dd className="text-right text-sm font-bold text-dark-900 break-keep">
                {formatStartAt(company.startAt, locale)}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
});
