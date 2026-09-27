'use client';

import { Building2, Calendar, Compass, ShieldCheck, formatDate } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { useLocale, useTranslations } from 'next-intl';
import { getLocalizedCompanyAddress, getLocalizedCompanyType } from '../../utils/localization';
import { useProductCompany } from './useProductCompany';

type ProductCompanyViewProps = {
  company: ReturnType<typeof useProductCompany>['company'];
};

export const ProductCompany = bind(useProductCompany, ({ company }: ProductCompanyViewProps) => {
  const t = useTranslations('ProductDetail');
  const locale = useLocale();
  const hasAnyInfo = Boolean(company?.name || company?.type || company?.address || company?.startAt);

  if (!hasAnyInfo) {
    return (
      <div className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-dark-200/80 bg-surface-50/50 px-6 py-10 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-500 shadow-2xs">
          <Building2 size={18} className="stroke-[2]" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-dark-900 break-keep">{t('company.empty')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-card-lg border border-dark-150 bg-white p-5 shadow-card sm:p-6 md:p-8">
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-bold tracking-tight text-dark-500">{t('company.basicInfo')}</h3>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {company?.name && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-dark-150/70 bg-surface-50/60 p-3.5 transition-colors hover:border-dark-200 hover:bg-surface-100/60">
              <div className="flex shrink-0 items-center gap-2 text-dark-500">
                <Building2 size={15} className="shrink-0 stroke-[1.75]" aria-hidden="true" />
                <dt className="text-xs font-semibold text-dark-600">{t('company.field.name')}</dt>
              </div>
              <dd className="min-w-0 flex-1 text-right text-sm font-bold text-dark-900 break-words sm:break-keep">
                {company.name}
              </dd>
            </div>
          )}
          {company?.type && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-dark-150/70 bg-surface-50/60 p-3.5 transition-colors hover:border-dark-200 hover:bg-surface-100/60">
              <div className="flex shrink-0 items-center gap-2 text-dark-500">
                <ShieldCheck size={15} className="shrink-0 stroke-[1.75]" aria-hidden="true" />
                <dt className="text-xs font-semibold text-dark-600">{t('company.field.status')}</dt>
              </div>
              <dd className="min-w-0 flex-1 text-right text-sm font-bold text-dark-900 break-words sm:break-keep">
                {getLocalizedCompanyType(company.type, locale) ?? company.type}
              </dd>
            </div>
          )}
          {company?.address && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-dark-150/70 bg-surface-50/60 p-3.5 transition-colors hover:border-dark-200 hover:bg-surface-100/60">
              <div className="flex shrink-0 items-center gap-2 text-dark-500">
                <Compass size={15} className="shrink-0 stroke-[1.75]" aria-hidden="true" />
                <dt className="text-xs font-semibold text-dark-600">{t('company.field.address')}</dt>
              </div>
              <dd className="min-w-0 flex-1 text-right text-sm font-bold text-dark-900 break-words sm:break-keep">
                {getLocalizedCompanyAddress(company.address, locale) ?? company.address}
              </dd>
            </div>
          )}
          {company?.startAt && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-dark-150/70 bg-surface-50/60 p-3.5 transition-colors hover:border-dark-200 hover:bg-surface-100/60">
              <div className="flex shrink-0 items-center gap-2 text-dark-500">
                <Calendar size={15} className="shrink-0 stroke-[1.75]" aria-hidden="true" />
                <dt className="text-xs font-semibold text-dark-600">{t('company.field.foundedAt')}</dt>
              </div>
              <dd className="min-w-0 flex-1 text-right text-sm font-bold text-dark-900 break-words sm:break-keep">
                {formatDate(company.startAt, '-', locale)}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
});
