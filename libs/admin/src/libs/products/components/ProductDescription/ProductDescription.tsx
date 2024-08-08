import { bind } from '@croco/utils-structure-react';
import { Text } from '@mantine/core';
import { useProductDescription } from './useProductDescription';

export const ProductDescription = bind(useProductDescription, ({ description }) => (
  <>
    <Text>{description}</Text>
  </>
));
