'use client';

import { Button } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { RefreshCw } from 'lucide-react';
import { useProductListRefreshButton } from './useProductListRefreshButton';

export const ProductListRefreshButton = bind(useProductListRefreshButton, ({ refresh, loading }) => (
  <Button onClick={refresh} variant="contained" color="secondary" className="gap-2" loading={loading}>
    새로고침
    {!loading && <RefreshCw size={16} />}
  </Button>
));
