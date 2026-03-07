import { Suspense } from 'react';
import { SearchProductList } from '../../components';

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
