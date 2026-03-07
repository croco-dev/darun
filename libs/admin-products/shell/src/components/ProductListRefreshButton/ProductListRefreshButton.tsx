'use client';

import { bind } from '@croco/utils-structure-react';
import { Button } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useProductListRefreshButton } from './useProductListRefreshButton';

export const ProductListRefreshButton = bind(useProductListRefreshButton, ({ refresh }) => (
  <Button onClick={refresh} rightSection={<IconRefresh size={16} />} color={'dark'} variant={'light'}>
    새로고침
  </Button>
));
