'use client';

import { Button } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { RefreshCw } from 'lucide-react';
import { useProductListRefreshButton } from './useProductListRefreshButton';

export const ProductListRefreshButton = bind(useProductListRefreshButton, ({ refresh, isRefreshing }) => (
  <Button onClick={refresh} variant="contained" color="secondary" className="gap-2" disabled={isRefreshing}>
    {isRefreshing ? '불러오는 중...' : '새로고침'}
    <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : undefined} />
  </Button>
));
