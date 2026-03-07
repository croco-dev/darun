'use client';

import { bind } from '@croco/utils-structure-react';
import { Button } from '@mantine/core';
import { useIndexProductButton } from './useIndexProductButton';

export const IndexProductButton = bind(useIndexProductButton, ({ indexProduct }) => (
  <Button onClick={indexProduct} variant={'light'} color={'dark'} size={'compact-sm'}>
    검색 인덱싱
  </Button>
));
