'use client';

import { Button, RefreshCw, Sparkles } from '@darun/ui';
import { AdminModal } from '@darun/ui-admin';
import DOMPurify from 'dompurify';
import { useGenerateProductDescriptionButton } from './useGenerateProductDescriptionButton';

interface GenerateProductDescriptionButtonProps {
  slug: string;
}

export function GenerateProductDescriptionButton({ slug }: GenerateProductDescriptionButtonProps) {
  const { handleGenerate, isGenerating, candidateJob, isPreviewOpen, closePreview, isApplying, handleApply } =
    useGenerateProductDescriptionButton(slug);

  const handleClick = () => {
    handleGenerate().catch(() => {});
  };

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={isGenerating || isApplying}
        variant="contained"
        color="secondary"
        className="gap-2 border-yellow-200 bg-yellow-50 text-yellow-700 active:scale-[0.98] motion-reduce:transform-none"
      >
        {isGenerating ? (
          <RefreshCw size={16} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <Sparkles size={16} className="shrink-0" aria-hidden="true" />
        )}
        <span className="whitespace-nowrap">{isGenerating ? 'AI 소개 생성 중...' : 'AI 소개 생성'}</span>
      </Button>

      <AdminModal opened={isPreviewOpen} onClose={closePreview} title="AI 소개 초안 검토" maxWidth="max-w-2xl">
        <div className="space-y-4">
          <p className="text-xs text-dark-500 break-words [word-break:keep-all]">
            생성된 AI 소개 초안입니다. 사실에 부합하는지 검토 후 [적용하기]를 눌러 제품 소개로 반영하세요.
          </p>

          <div
            className="max-h-[60vh] overflow-y-auto rounded-lg border border-dark-200 bg-surface-50 p-4 text-sm text-dark-800"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(candidateJob?.candidateHtml ?? ''),
            }}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-dark-200">
            <Button
              type="button"
              variant="base"
              onClick={closePreview}
              disabled={isApplying}
              className="active:scale-[0.98] motion-reduce:transform-none"
            >
              <span className="whitespace-nowrap">닫기</span>
            </Button>
            <Button
              type="button"
              variant="contained"
              color="primary"
              onClick={() => handleApply().catch(() => {})}
              disabled={isApplying || !candidateJob}
              className="active:scale-[0.98] motion-reduce:transform-none"
            >
              <span className="whitespace-nowrap">{isApplying ? '적용 중...' : '적용하기'}</span>
            </Button>
          </div>
        </div>
      </AdminModal>
    </>
  );
}
