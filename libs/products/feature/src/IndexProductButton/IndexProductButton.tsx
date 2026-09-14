'use client';

import { Button } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { useIndexProductButton } from './useIndexProductButton';

export const IndexProductButton = bind(useIndexProductButton, ({ indexProduct, loading }) => (
  <Button onClick={indexProduct} variant="contained" color="secondary" size="sm" loading={loading}>
    검색 인덱싱
  </Button>
));
