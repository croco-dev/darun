import { bind } from '@croco/utils-structure-react';
import { AdminField, AdminInput } from '@darun/ui-admin';
import { useSearchProductField } from './useSearchProductField';

export const SearchProductField = bind(useSearchProductField, ({ products, searchProduct, selectProduct }) => (
  <AdminField label="다른 서비스">
    <AdminInput
      type="text"
      placeholder="서비스 이름을 검색하세요."
      list="product-list"
      onChange={e => searchProduct(e.target.value)}
    />
    <datalist id="product-list">
      {products.map(product => (
        <option key={product.value} value={product.value}>
          {product.label}
        </option>
      ))}
    </datalist>
  </AdminField>
));
