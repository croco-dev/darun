'use client';

import { Button, RefreshCw } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { useIndexProductButton } from './useIndexProductButton';

export const IndexProductButton = bind(useIndexProductButton, ({ indexProduct, loading }) => (
  <Button
    onClick={() => {
      indexProduct().catch(() => {});
    }}
    disabled={loading}
    variant="contained"
    color="secondary"
    size="sm"
    className="gap-2 active:scale-[0.98] motion-reduce:transform-none"
  >
    {loading ? (
      <RefreshCw size={14} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
    ) : null}
    <span className="whitespace-nowrap">{loading ? '색인 중...' : '검색 인덱싱'}</span>
  </Button>
));
