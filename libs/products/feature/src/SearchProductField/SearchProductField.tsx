import { bind } from '@croco/utils-structure-react';
import { useSearchProductField } from './useSearchProductField';

export const SearchProductField = bind(useSearchProductField, ({ products, searchProduct, selectProduct }) => (
  <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
    <span>다른 서비스</span>
    <input
      type="text"
      className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900"
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
  </label>
));
