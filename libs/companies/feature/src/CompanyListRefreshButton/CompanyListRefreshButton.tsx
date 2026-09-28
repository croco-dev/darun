'use client';

import { Button, RefreshCw } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { useCompanyListRefreshButton } from './useCompanyListRefreshButton';

export const CompanyListRefreshButton = bind(useCompanyListRefreshButton, ({ refresh, isRefreshing }) => (
  <Button
    type="button"
    onClick={refresh}
    variant="contained"
    color="secondary"
    className="inline-flex items-center gap-2 active:scale-[0.98] motion-reduce:transform-none"
    disabled={isRefreshing}
  >
    <RefreshCw
      size={16}
      className={`shrink-0 ${isRefreshing ? 'animate-spin motion-reduce:animate-none' : ''}`}
      aria-hidden="true"
    />
    <span className="whitespace-nowrap">{isRefreshing ? '불러오는 중...' : '새로고침'}</span>
  </Button>
));
