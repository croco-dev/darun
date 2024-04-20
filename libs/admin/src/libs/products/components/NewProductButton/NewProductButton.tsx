'use client';

import { bind } from '@croco/utils-structure-react';
import { Button } from '@mantine/core';
import { useNewProductButton } from './useNewProductButton';

export const NewProductButton = bind(useNewProductButton, ({ moveToNewProduct }) => (
  <Button onClick={moveToNewProduct}>new</Button>
));
