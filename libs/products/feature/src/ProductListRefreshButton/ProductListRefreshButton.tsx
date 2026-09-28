'use client';

import { Button, RefreshCw } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { useProductListRefreshButton } from './useProductListRefreshButton';

export const ProductListRefreshButton = bind(useProductListRefreshButton, ({ refresh, isRefreshing }) => (
  <Button
    onClick={refresh}
    variant="contained"
    color="secondary"
    className="gap-2 active:scale-[0.98] motion-reduce:transform-none"
    disabled={isRefreshing}
  >
    <span className="whitespace-nowrap">{isRefreshing ? '불러오는 중...' : '새로고침'}</span>
    <RefreshCw
      size={16}
      className={`shrink-0 ${isRefreshing ? 'animate-spin motion-reduce:animate-none' : ''}`}
      aria-hidden="true"
    />
  </Button>
));
