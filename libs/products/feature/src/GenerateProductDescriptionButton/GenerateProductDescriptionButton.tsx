'use client';

import { Button, RefreshCw, Sparkles } from '@darun/ui';
import { AdminInput, AdminModal } from '@darun/ui-admin';
import DOMPurify from 'dompurify';
import { useGenerateProductDescriptionButton } from './useGenerateProductDescriptionButton';

interface GenerateProductDescriptionButtonProps {
  slug: string;
  descriptionJobId?: string;
  onJobChange?: (id: string) => void;
}

export function GenerateProductDescriptionButton({
  slug,
  descriptionJobId,
  onJobChange,
}: GenerateProductDescriptionButtonProps) {
  const {
    handleGenerate,
    isGenerating,
    candidateJob,
    isPreviewOpen,
    closePreview,
    isApplying,
    handleApply,
    jobIdInput,
    setJobIdInput,
    isReopening,
    handleReopenJob,
    staleApplyNotice,
  } = useGenerateProductDescriptionButton(slug, descriptionJobId, onJobChange);

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
          {candidateJob?.id && <p className="text-xs text-dark-500">후보 작업 ID: {candidateJob.id}</p>}
          <p className="text-xs text-dark-500">
            현재 제품: {slug} · 후보 대상 제품 ID: {candidateJob?.productId ?? '알 수 없음'}
          </p>
          {candidateJob?.appliedAt && (
            <p className="text-xs text-dark-500">
              과거에 적용된 후보입니다. 다시 적용해도 이후 사람 편집을 덮어쓰지 않습니다.
            </p>
          )}
          {staleApplyNotice && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3" role="alert">
              <p className="text-xs font-semibold text-amber-800">적용 보류: 근거가 변경되었습니다.</p>
              <p className="mt-1 text-xs text-amber-800">{staleApplyNotice}</p>
              <p className="mt-1 text-xs text-amber-800">
                수동 편집은 유지됩니다. 새 근거로 다시 생성한 뒤 검토해 주세요.
              </p>
            </div>
          )}

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

      <form
        className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={event => {
          event.preventDefault();
          void handleReopenJob();
        }}
      >
        <label htmlFor={`candidate-job-id-${slug}`} className="sr-only">
          후보 작업 ID로 다시 열기
        </label>
        <AdminInput
          id={`candidate-job-id-${slug}`}
          name="candidateJobId"
          value={jobIdInput}
          onChange={event => setJobIdInput(event.currentTarget.value)}
          placeholder="후보 작업 ID로 다시 열기"
          disabled={isReopening || isGenerating}
          className="sm:max-w-56"
        />
        <Button
          type="submit"
          variant="base"
          color="secondary"
          size="sm"
          disabled={isReopening || isGenerating || !jobIdInput.trim()}
          className="active:scale-[0.98] motion-reduce:transform-none"
        >
          <span className="whitespace-nowrap">{isReopening ? '여는 중...' : '후보 다시 열기'}</span>
        </Button>
      </form>
    </>
  );
}
