import { Suspense } from 'react';
import { SearchProductList, SearchProductListSkeleton } from '../../components';

type SearchProductResultProps = { query: string };

export const SearchProductResult = ({ query }: SearchProductResultProps) => {
  return (
    <>
      <Suspense fallback={<SearchProductListSkeleton />}>
        <SearchProductList query={query} />
      </Suspense>
    </>
  );
};
