'use client';

import { Button, ChevronLeft, ChevronRight, ExternalLink, ImageOff, Layers, RefreshCw } from '@darun/ui';
import { notFound, useNavigate, useSearchParams } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useCallback, useEffect, useState } from 'react';
import { VISUAL_PLATFORM_LABELS, VISUAL_FLOW_TYPE_LABELS } from './flowClassifications';
import { FlowDetailState, useFlowDetail } from './useFlowDetail';

const STEP_QUERY_KEY = 'step';

function StepImage({ src, alt }: { src: string; alt: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  // 단계마다 다른 이미지를 보여주므로, src가 바뀌면 이전 단계의 실패 상태를 되돌린다.
  if (failedSrc !== null && failedSrc !== src) {
    setFailedSrc(null);
  }

  if (failedSrc === src) {
    return (
      <div
        role="img"
        aria-label="이미지를 불러올 수 없음"
        className="flex min-h-72 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dark-200 bg-surface-100 text-dark-400"
      >
        <ImageOff size={32} aria-hidden="true" />
        <span className="text-sm text-dark-500">이미지를 불러올 수 없어요. 다른 단계로 이동해 보세요.</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailedSrc(src)}
      className="max-h-[calc(100dvh-16rem)] w-full rounded-2xl border border-dark-150 bg-surface-100 object-contain"
    />
  );
}

const View = ({ status, detail, retry }: FlowDetailState) => {
  const navigate = useNavigate();
  const searchParams = useSearchParams();

  // UI와 URL은 1부터 시작하는 단계 번호를 사용한다. GraphQL steps의 position은 0부터 시작한다.
  const stepCount = detail?.steps.length ?? 0;
  const stepParamRaw = searchParams.get(STEP_QUERY_KEY);
  const stepParam = stepParamRaw !== null ? Number.parseInt(stepParamRaw, 10) : null;
  // URL의 step 값은 1 이상 stepCount 이하로 정규화한다. 벗어난 값은 첫 단계로 돌아간다.
  const currentStepNumber =
    stepParam !== null && Number.isInteger(stepParam) && stepParam >= 1 && stepParam <= stepCount ? stepParam : 1;

  const [activeStepNumber, setActiveStepNumber] = useState(1);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL step 파라미터 동기화에 필요
    setActiveStepNumber(currentStepNumber);
  }, [currentStepNumber, detail?.id]);

  const goToStep = useCallback(
    (stepNumber: number) => {
      if (stepNumber < 1 || stepNumber > stepCount || stepCount === 0) {
        return;
      }
      const params = new URLSearchParams();
      if (stepNumber > 1) {
        params.set(STEP_QUERY_KEY, String(stepNumber));
      }
      const queryString = params.toString();
      navigate(queryString.length > 0 ? `/flows/${detail?.id ?? ''}?${queryString}` : `/flows/${detail?.id ?? ''}`, {
        replace: true,
      });
      setActiveStepNumber(stepNumber);
    },
    [detail?.id, navigate, stepCount]
  );

  // 왼쪽·오른쪽 화살표로 단계를 이동한다. 입력 요소에 포커스가 있을 때는 가로지르지 않는다.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }
      if (stepCount < 2) {
        return;
      }
      if (event.key === 'ArrowLeft' && activeStepNumber > 1) {
        event.preventDefault();
        goToStep(activeStepNumber - 1);
      }
      if (event.key === 'ArrowRight' && activeStepNumber < stepCount) {
        event.preventDefault();
        goToStep(activeStepNumber + 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeStepNumber, goToStep, stepCount]);

  if (status === 'loading') {
    return (
      <main id="main-content" className="w-full py-8 md:py-12">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 md:px-6" aria-busy="true">
          <div
            className="h-8 w-2/3 animate-pulse rounded bg-surface-200 motion-reduce:animate-none"
            aria-hidden="true"
          />
          <div
            className="h-4 w-1/3 animate-pulse rounded bg-surface-200 motion-reduce:animate-none"
            aria-hidden="true"
          />
          <div
            className="min-h-72 w-full animate-pulse rounded-2xl bg-surface-200 motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span className="sr-only">플로를 불러오는 중</span>
        </div>
      </main>
    );
  }

  if (status === 'not-found') {
    notFound();
  }

  if (status === 'error' || detail === null) {
    return (
      <main id="main-content" className="w-full py-8 md:py-12">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 md:px-6">
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-2xl border border-dark-200 bg-surface-50 p-8 text-center"
          >
            <p className="text-sm font-semibold text-dark-900">플로를 불러오지 못했어요.</p>
            <Button type="button" variant="contained" color="primary" size="sm" onClick={() => retry()}>
              <RefreshCw size={16} />
              다시 시도
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const steps = detail.steps;
  const stepIndex = Math.min(activeStepNumber, stepCount) - 1;
  const activeStep = steps[stepIndex];
  const hasNextStep = stepIndex < stepCount - 1;
  const hasPrevStep = stepIndex > 0;
  const platformLabel = VISUAL_PLATFORM_LABELS[detail.platform] ?? detail.platform;
  const flowTypeLabel = VISUAL_FLOW_TYPE_LABELS[detail.flowType] ?? detail.flowType;

  return (
    <main id="main-content" className="w-full py-8 md:py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 md:px-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-dark-400">
            <Layers size={14} className="shrink-0" aria-hidden="true" />
            <span>
              {platformLabel} · {flowTypeLabel} · {stepCount}단계
            </span>
          </div>
          <h1 className="break-words text-2xl font-bold tracking-tight text-dark-900 md:text-3xl">{detail.title}</h1>
          <p className="text-sm text-dark-500">
            <span className="font-medium text-dark-700">{detail.product.name}</span>
          </p>
          {detail.description.length > 0 && (
            <p className="max-w-2xl text-sm leading-relaxed text-dark-500">{detail.description}</p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="shadow"
              color="primary"
              size="sm"
              onClick={() => goToStep(activeStepNumber - 1)}
              disabled={!hasPrevStep}
            >
              <ChevronLeft size={16} />
              이전
              <span className="sr-only"> 단계</span>
            </Button>
            <p className="text-sm font-semibold text-dark-700" aria-live="polite">
              {activeStepNumber}/{stepCount} 단계
            </p>
            <Button
              type="button"
              variant="shadow"
              color="primary"
              size="sm"
              onClick={() => goToStep(activeStepNumber + 1)}
              disabled={!hasNextStep}
            >
              다음
              <ChevronRight size={16} />
              <span className="sr-only"> 단계</span>
            </Button>
          </div>

          {activeStep && (
            <figure className="flex flex-col gap-2">
              <StepImage src={activeStep.screenshot.imageUrl} alt={activeStep.screenshot.imageAlt} />
              <figcaption className="flex flex-col gap-1 text-sm text-dark-600">
                <span className="text-xs font-bold text-dark-400">단계 {activeStepNumber}</span>
                <span className="font-medium text-dark-800">
                  {activeStep.screenshot.title ?? activeStep.screenshot.imageAlt}
                </span>
                {activeStep.caption.length > 0 && <span>{activeStep.caption}</span>}
              </figcaption>
            </figure>
          )}
        </div>

        {stepCount > 0 && (
          <nav aria-label="단계 썸네일">
            <ul className="flex list-none gap-2 overflow-x-auto pb-1">
              {steps.map((step, index) => {
                const stepNumber = index + 1;
                const isActive = index === stepIndex;
                return (
                  <li key={step.screenshot.id}>
                    <button
                      type="button"
                      onClick={() => goToStep(stepNumber)}
                      aria-current={isActive ? 'step' : undefined}
                      className={`flex shrink-0 flex-col items-center gap-1 rounded-lg border p-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 ${
                        isActive ? 'border-dark-900 bg-surface-100' : 'border-dark-150 bg-white hover:border-dark-300'
                      }`}
                    >
                      <span className="sr-only">단계 {stepNumber}로 이동</span>
                      <span className={`text-2xs font-bold ${isActive ? 'text-dark-900' : 'text-dark-400'}`}>
                        {stepNumber}
                      </span>
                      <img
                        src={step.screenshot.imageUrl}
                        alt={step.screenshot.imageAlt}
                        loading="lazy"
                        className="h-14 w-24 rounded object-cover object-top"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            as="a"
            href={`/flows?product=${encodeURIComponent(detail.product.slug)}`}
            variant="contained"
            color="primary"
            size="md"
          >
            이 서비스의 플로
          </Button>
          <Button
            as="a"
            href={`https://darun.io/ko/products/${encodeURIComponent(detail.product.slug)}`}
            variant="shadow"
            color="primary"
            size="md"
          >
            <ExternalLink size={16} />
            서비스 소개
          </Button>
        </div>
      </div>
    </main>
  );
};

export const FlowDetail = bind((props: { id: string }) => ({ ...useFlowDetail(props.id) }), View, {
  displayName: 'FlowDetail',
});
