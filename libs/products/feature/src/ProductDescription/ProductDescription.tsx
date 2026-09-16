'use client';

import { Button } from '@darun/ui';
import { AdminErrorState, AdminLoadingState } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useEffect, useState } from 'react';
import { useProductDescription } from './useProductDescription';

type DOMPurify = typeof import('dompurify').default;

export const ProductDescription = bind(useProductDescription, ({ description, loading, error, refetch }) => {
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

  if (loading) {
    return <AdminLoadingState />;
  }

  if (error) {
    return (
      <AdminErrorState
        title="설명을 불러오지 못했습니다."
        error={error}
        action={
          <Button type="button" variant="contained" color="primary" onClick={() => refetch()}>
            다시 시도
          </Button>
        }
      />
    );
  }

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
      className="text-sm leading-6 text-dark-900 space-y-2 [&_p]:min-h-[1.5em] [&_a]:text-primary-700 [&_a]:underline [&_a:hover]:text-primary-800 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-dark-950 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-dark-950 [&_blockquote]:border-l-2 [&_blockquote]:border-dark-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_code]:bg-dark-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2"
      dangerouslySetInnerHTML={{
        __html: sanitizedDescription,
      }}
    />
  );
});
