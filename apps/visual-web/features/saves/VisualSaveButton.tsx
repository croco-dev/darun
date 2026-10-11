'use client';

import { Bookmark, Button } from '@darun/ui';
import { useVisualSaveButton } from './useVisualSaveButton';
import { VisualLoginButton } from './VisualLoginButton';

type VisualSaveButtonProps = {
  kind: 'screenshot' | 'flow';
  id: string;
  enabled: boolean;
};

/**
 * M3 저장 버튼. 로그인 필수 — 미인증 시 로그인 버튼 노출.
 * M5: 로그인 버튼 클릭 시 상세 경로로 복귀.
 */
export function VisualSaveButton({ kind, id, enabled }: VisualSaveButtonProps) {
  const { saved, isToggling, needsLogin, toggleError, toggle, retry } = useVisualSaveButton({ kind, id, enabled });

  if (needsLogin) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-dark-500 break-words [word-break:keep-all]">저장은 로그인 후 이용할 수 있어요.</p>
        <VisualLoginButton
          redirectTo={kind === 'screenshot' ? `/screenshots/${encodeURIComponent(id)}` : `/flows/${encodeURIComponent(id)}`}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant={saved ? 'contained' : 'shadow'}
        color="primary"
        size="sm"
        onClick={toggle}
        disabled={isToggling}
        aria-pressed={saved}
        className="active:scale-[0.98] motion-reduce:transform-none"
      >
        <Bookmark size={16} className="shrink-0" aria-hidden="true" />
        <span className="whitespace-nowrap">{saved ? '저장됨' : '저장하기'}</span>
      </Button>
      {toggleError && (
        <div role="alert" className="flex items-center gap-2">
          <span className="text-xs text-dark-500">저장에 실패했어요.</span>
          <Button type="button" variant="shadow" size="sm" onClick={retry}>
            다시 시도
          </Button>
        </div>
      )}
    </div>
  );
}
