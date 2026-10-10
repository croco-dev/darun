'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface AdminSearchInputProps {
  initialQuery: string;
}

const SEARCH_DEBOUNCE_MS = 300;

export function AdminSearchInput({ initialQuery }: AdminSearchInputProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);
  const lastSubmittedQueryRef = useRef(initialQuery.trim());

  const currentQuery = searchParams.get('query') ?? '';

  useEffect(() => {
    const normalizedCurrentQuery = currentQuery.trim();

    if (normalizedCurrentQuery === lastSubmittedQueryRef.current) {
      return;
    }

    setValue(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    const normalizedValue = value.trim();
    const normalizedCurrentQuery = currentQuery.trim();

    if (normalizedValue === normalizedCurrentQuery) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      lastSubmittedQueryRef.current = normalizedValue;

      const nextParams = new URLSearchParams(searchParams.toString());

      if (normalizedValue) {
        nextParams.set('query', normalizedValue);
      } else {
        nextParams.delete('query');
      }

      nextParams.delete('page');

      const queryString = nextParams.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentQuery, pathname, router, searchParams, value]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        name="query"
        value={value}
        onChange={event => setValue(event.target.value)}
        placeholder="앱 이름 검색"
        className="pl-9"
      />
    </div>
  );
}
