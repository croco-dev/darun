'use client';

import { bind } from '@croco/utils-structure-react';
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

  if (!description) {
    return <p className="text-xs text-black/60">설명이 없습니다.</p>;
  }

  if (!domPurify) {
    return <div className="whitespace-pre-wrap text-sm leading-6 text-dark-900">{description}</div>;
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
