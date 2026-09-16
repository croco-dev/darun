'use client';

import { Button, cn } from '@darun/ui';
import { AdminErrorState } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useProductInfo } from './useProductInfo';

const DEFAULT_LOGO = '/images/default-product-icon.svg';

export const ProductInfo = bind(useProductInfo, ({ name, logoUrl, summary, slug, loading, error, refetch }) => {
  const [imgSrc, setImgSrc] = useState(logoUrl || DEFAULT_LOGO);

  useEffect(() => {
    setImgSrc(logoUrl || DEFAULT_LOGO);
  }, [logoUrl]);

  if (loading && !name) {
    return (
      <div className="flex items-start gap-3 animate-pulse" aria-busy="true" aria-label="서비스 정보 불러오는 중">
        <div className="h-16 w-16 rounded-xl border border-dark-200 bg-surface-200 shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-7 w-48 rounded bg-surface-200" />
          <div className="h-4 w-72 rounded bg-surface-200" />
          <div className="h-6 w-24 rounded bg-surface-200" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <AdminErrorState
        title="서비스 정보를 불러오지 못했습니다."
        error={error}
        action={
          <Button type="button" onClick={() => refetch()} variant="contained" color="primary">
            다시 시도
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex items-start gap-3">
      <Image
        src={imgSrc}
        unoptimized
        alt={`${name} 서비스 로고`}
        width={64}
        height={64}
        onError={() => setImgSrc(DEFAULT_LOGO)}
        className="h-16 w-16 rounded-xl border border-dark-200 object-contain bg-white shrink-0"
      />
      <div className="flex flex-col gap-1">
        <div className="flex flex-col gap-px">
          <h2 className="text-2xl font-semibold text-dark-900">{name}</h2>
          <p className={cn('text-sm', summary ? 'text-dark-500' : 'text-dark-400 italic')}>
            {summary || '한 줄 소개가 없습니다.'}
          </p>
        </div>
        {slug && (
          <code className="inline-flex w-fit rounded-md bg-surface-100 px-2 py-1 text-sm font-bold text-dark-900">
            {slug}
          </code>
        )}
      </div>
    </div>
  );
});
