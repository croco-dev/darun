import { SearchProductList } from '@search/components';
import { Suspense } from 'react';

type SearchProductResultProps = { query: string };

export const SearchProductResult = ({ query }: SearchProductResultProps) => {
  return (
    <>
      <Suspense fallback={<></>}>
        <SearchProductList query={query} />
      </Suspense>
    </>
  );
};
