'use client';

import { bind } from '@croco/utils-structure-react';
import { useEffect, useState } from 'react';
import { useProductDescription } from './useProductDescription';

export const ProductDescription = bind(useProductDescription, ({ description }) => {
  const [sanitizedDescription, setSanitizedDescription] = useState('');

  useEffect(() => {
    if (description) {
      import('dompurify').then(DOMPurify => {
        setSanitizedDescription(DOMPurify.default.sanitize(description));
      });
    }
  }, [description]);

  if (!description) {
    return <p className="text-xs text-black/60">설명이 없습니다.</p>;
  }

  return (
    <div
      className="whitespace-pre-wrap text-sm leading-6 text-dark-900"
      dangerouslySetInnerHTML={{
        __html: sanitizedDescription || description,
      }}
    />
  );
});
