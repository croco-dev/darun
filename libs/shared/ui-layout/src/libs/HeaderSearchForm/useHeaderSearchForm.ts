import { useSearchParams, useNavigate } from '@darun/utils-router';
import { FormEvent, useState } from 'react';

export function useHeaderSearchForm() {
  const searchParams = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get('query') ?? '');

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    navigate(`/search/product?query=${query}`);
  };

  return { query, setQuery, onSubmit };
}
