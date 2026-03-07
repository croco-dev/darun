import { bind } from '@croco/utils-structure-react';
import { Select } from '@mantine/core';
import { useSearchProductField } from './useSearchProductField';

export const SearchProductField = bind(useSearchProductField, ({ products, searchProduct, selectProduct }) => (
  <Select
    label="다른 서비스"
    placeholder="서비스 이름을 검색하세요."
    data={products}
    searchable
    onSearchChange={searchProduct}
    onChange={selectProduct}
  />
));
