'use client';

import { AdminField, AdminInput } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useId } from 'react';
import { useSearchProductField } from './useSearchProductField';

export const SearchProductField = bind(useSearchProductField, ({ products, searchProduct, selectProduct }) => {
  const datalistId = useId();

  return (
    <AdminField label="다른 서비스">
      <AdminInput
        type="text"
        placeholder="서비스 이름을 검색하세요."
        list={datalistId}
        onChange={e => {
          const val = e.target.value;
          searchProduct(val);
          const matched = products.find(p => p.label === val || p.value === val);
          selectProduct(matched ? matched.value : null);
        }}
      />
      <datalist id={datalistId}>
        {products.map(product => (
          <option key={product.value} value={product.label}>
            {product.label}
          </option>
        ))}
      </datalist>
    </AdminField>
  );
});
