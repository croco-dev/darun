'use client';

import DOMPurify from 'dompurify';
import { useProductDescription } from './useProductDescription';

type ProductDescriptionProps = {
  slug: string;
};

export function ProductDescription({ slug }: ProductDescriptionProps) {
  const { description } = useProductDescription({ slug });

  if (!description) {
    return <p className="text-xs text-black/60">설명이 없습니다.</p>;
  }

  return (
    <div
      className="whitespace-pre-wrap text-sm leading-6 text-dark-900"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }}
    />
  );
}
