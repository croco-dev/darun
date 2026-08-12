'use client';

import { Search } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { ChangeEvent } from 'react';
import { useHeaderSearchForm } from './useHeaderSearchForm';

export const HeaderSearchForm = bind(useHeaderSearchForm, ({ query, setQuery, onSubmit }) => (
  <form
    className="flex min-w-0 flex-1 items-center gap-2 rounded-search border border-solid border-dark-200 bg-white px-3.5 py-2 shadow-button transition-all duration-200 ease-out focus-within:border-dark-900 focus-within:ring-2 focus-within:ring-dark-900/10 focus-within:shadow-button-hover motion-reduce:transition-none"
    onSubmit={onSubmit}
  >
    <Search size={18} className="shrink-0 text-dark-400" aria-hidden="true" />
    <input
      aria-label="검색어"
      type="text"
      placeholder="현재 사용 중인 서비스를 찾아보세요"
      className="w-full border-none bg-transparent text-sm tracking-tight text-dark-900 outline-none placeholder:text-dark-400 focus-visible:outline-none md:text-base"
      value={query}
      onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
    />
  </form>
));
