'use client';

import { bind } from '@darun/utils-structure-react';
import { useEffect, useState } from 'react';
import { useProductDescription } from './useProductDescription';

type DOMPurify = typeof import('dompurify').default;

export const ProductDescription = bind(useProductDescription, ({ description }) => {
  const [domPurify, setDomPurify] = useState<DOMPurify | null>(null);

  useEffect(() => {
    if (domPurify) {
      return;
    }

    let isMounted = true;

    import('dompurify').then(DOMPurify => {
      if (isMounted) {
        setDomPurify(() => DOMPurify.default);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [domPurify]);

  if (!description || !description.trim()) {
    return <p className="text-xs text-dark-500">설명이 없습니다.</p>;
  }

  if (!domPurify) {
    return (
      <div className="flex flex-col gap-2 animate-pulse py-2">
        <div className="h-4 w-3/4 rounded bg-surface-200" />
        <div className="h-4 w-1/2 rounded bg-surface-200" />
      </div>
    );
  }

  const sanitizedDescription = domPurify.sanitize(description);

  return (
    <div
      className="whitespace-pre-wrap text-sm leading-6 text-dark-900"
      dangerouslySetInnerHTML={{
        __html: sanitizedDescription,
      }}
    />
  );
});
