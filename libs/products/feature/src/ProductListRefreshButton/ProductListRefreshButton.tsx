'use client';

import { bind } from '@croco/utils-structure-react';
import { Button } from '@darun/ui';
import { RefreshCw } from 'lucide-react';
import { useProductListRefreshButton } from './useProductListRefreshButton';

export const ProductListRefreshButton = bind(useProductListRefreshButton, ({ refresh }) => (
  <Button onClick={refresh} variant="contained" color="secondary" className="gap-2">
    새로고침
    <RefreshCw size={16} />
  </Button>
));
