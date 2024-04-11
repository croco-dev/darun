'use client';

import { bind } from '@croco/utils-structure-react';
import { SearchIcon } from '@darun/ui-icons';
import { HStack, Input } from '@kuma-ui/core';
import { ChangeEvent } from 'react';
import { useHeaderSearchForm } from './useHeaderSearchForm';

export const HeaderSearchForm = bind(useHeaderSearchForm, ({ query, setQuery, onSubmit }) => (
  <HStack
    as={'form'}
    flexGrow={1}
    borderRadius={14}
    border="1px solid rgba(0, 0, 0, 0.15)"
    px={16}
    py={11}
    borderStyle="solid"
    gap={8}
    boxShadow="0px 2px 4px 0px rgba(0, 0, 0, 0.08)"
    onSubmit={onSubmit}
  >
    <SearchIcon size={18} />
    <Input
      type={'text'}
      width="100%"
      border="none"
      outline="none"
      placeholder="현재 사용 중인 서비스를 찾아보세요!"
      color="#555"
      fontSize={14}
      letterSpacing={-0.1}
      value={query}
      onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
    />
  </HStack>
));
