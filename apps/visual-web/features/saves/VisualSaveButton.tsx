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
  const { saved, status, retryStatus, isToggling, needsLogin, toggleError, toggle, retry } = useVisualSaveButton({
    kind,
    id,
    enabled,
  });

  if (needsLogin) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-xs text-dark-600">계정에 저장하려면 로그인해 주세요.</p>
        <VisualLoginButton
          redirectTo={
            kind === 'screenshot' ? `/screenshots/${encodeURIComponent(id)}` : `/flows/${encodeURIComponent(id)}`
          }
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
        disabled={!enabled || status !== 'ready' || isToggling}
        aria-pressed={status === 'ready' ? saved : undefined}
        aria-busy={status === 'loading' || isToggling}
        className="active:scale-[0.98] motion-reduce:transform-none"
      >
        <Bookmark size={16} className="shrink-0" aria-hidden="true" />
        <span className="whitespace-nowrap">
          {status === 'loading'
            ? '저장 상태 확인 중…'
            : status === 'error'
              ? '저장 상태 확인 필요'
              : saved
                ? '계정에 저장됨'
                : '계정에 저장'}
        </span>
      </Button>
      <p className="text-xs text-dark-500">계정 저장함에서 확인할 수 있습니다. 브라우저 컬렉션과는 별개입니다.</p>
      {status === 'error' && (
        <div role="alert" className="flex items-center gap-2">
          <span className="text-xs text-dark-500">저장 상태를 확인하지 못했어요.</span>
          <Button type="button" variant="shadow" size="sm" onClick={retryStatus}>
            다시 확인
          </Button>
        </div>
      )}
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
