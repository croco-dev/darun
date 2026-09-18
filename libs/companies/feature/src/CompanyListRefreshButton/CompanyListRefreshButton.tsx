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
    className="inline-flex items-center gap-2"
    disabled={isRefreshing}
  >
    <RefreshCw size={16} className={isRefreshing ? 'animate-spin motion-reduce:animate-none' : undefined} />
    {isRefreshing ? '불러오는 중...' : '새로고침'}
  </Button>
));
