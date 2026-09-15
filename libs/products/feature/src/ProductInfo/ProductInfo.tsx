'use client';

import { bind } from '@darun/utils-structure-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useProductInfo } from './useProductInfo';

const DEFAULT_LOGO = '/images/default-product-icon.svg';

export const ProductInfo = bind(useProductInfo, ({ name, logoUrl, summary, slug }) => {
  const [imgSrc, setImgSrc] = useState(logoUrl || DEFAULT_LOGO);

  useEffect(() => {
    setImgSrc(logoUrl || DEFAULT_LOGO);
  }, [logoUrl]);

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
          <p className="text-sm text-dark-500">{summary}</p>
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
