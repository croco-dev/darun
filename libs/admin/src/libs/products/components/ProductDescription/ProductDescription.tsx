import { bind } from '@croco/utils-structure-react';
import { Text } from '@mantine/core';
import { useProductDescription } from './useProductDescription';

export const ProductDescription = bind(useProductDescription, ({ description }) => (
  <>{description ? <Text>{description}</Text> : <Text size={'xs'}>설명이 없습니다.</Text>}</>
));
