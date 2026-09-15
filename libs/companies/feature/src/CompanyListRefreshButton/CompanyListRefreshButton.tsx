'use client';

import { Button } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { RefreshCw } from 'lucide-react';
import { useCompanyListRefreshButton } from './useCompanyListRefreshButton';

export const CompanyListRefreshButton = bind(useCompanyListRefreshButton, ({ refresh }) => (
  <Button onClick={refresh} variant="contained" color="secondary" className="gap-2">
    새로고침
    <RefreshCw size={16} />
  </Button>
));
