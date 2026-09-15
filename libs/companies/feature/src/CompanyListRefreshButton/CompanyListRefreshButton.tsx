'use client';

import { Button } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { RefreshCw } from 'lucide-react';
import { useCompanyListRefreshButton } from './useCompanyListRefreshButton';

export const CompanyListRefreshButton = bind(useCompanyListRefreshButton, ({ refresh, isRefreshing }) => (
  <Button onClick={refresh} variant="contained" color="secondary" className="gap-2" disabled={isRefreshing}>
    {isRefreshing ? '불러오는 중...' : '새로고침'}
    <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : undefined} />
  </Button>
));
