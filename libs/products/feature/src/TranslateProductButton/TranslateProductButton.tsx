'use client';

import { Button } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { useTranslateProductButton } from './useTranslateProductButton';

export const TranslateProductButton = bind(
  useTranslateProductButton,
  ({ translateProduct, loading, lastStatus, lastError, lastJobId }) => (
    <span className="inline-flex flex-col gap-1">
      <Button
        onClick={translateProduct}
        variant="contained"
        color="secondary"
        size="sm"
        disabled={loading}
        className="active:scale-[0.98] motion-reduce:transform-none"
      >
        <span className="whitespace-nowrap">
          {loading
            ? '번역 생성 중...'
            : lastStatus === 'failed' || lastStatus === 'superseded'
              ? '이 상품 다시 번역'
              : 'AI 영문 번역'}
        </span>
      </Button>
      {(lastStatus === 'failed' || lastStatus === 'superseded') && (
        <span className="text-2xs text-cherry-700" role="status">
          {lastStatus === 'superseded'
            ? `원문 변경으로 보류됨${lastJobId ? ` · 작업 ${lastJobId.slice(0, 8)}` : ''}`
            : `번역 실패${lastError ? `: ${lastError.slice(0, 80)}` : ''}`}
        </span>
      )}
    </span>
  )
);
