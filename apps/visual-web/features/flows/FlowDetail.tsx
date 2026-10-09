'use client';

import { Button, ChevronLeft, ChevronRight, ExternalLink, ImageOff, Link2, RefreshCw } from '@darun/ui';
import { Link, notFound, useNavigate, useRouter, useSearchParams } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SaveButton } from '../collections/SaveButton';
import { VISUAL_CARD_IMAGE_LOADING, VISUAL_DETAIL_IMAGE_FETCH_PRIORITY } from '../perf/imageLoading';
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
        <ImageOff size={32} className="shrink-0" aria-hidden="true" />
        <span className="text-sm text-dark-500 break-words [word-break:keep-all]">
          이미지를 불러올 수 없어요. 다른 단계로 이동해 보세요.
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      fetchPriority={VISUAL_DETAIL_IMAGE_FETCH_PRIORITY}
      onError={() => setFailedSrc(src)}
      className="max-h-[calc(100dvh-16rem)] w-full rounded-2xl border border-dark-150 bg-surface-100 object-contain"
    />
  );
}

const View = ({ status, detail, retry }: FlowDetailState) => {
  const navigate = useNavigate();
  const router = useRouter();
  const searchParams = useSearchParams();
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  // UI와 URL은 1부터 시작하는 단계 번호를 사용한다. GraphQL steps의 position은 0부터 시작한다.
  const stepCount = detail?.steps.length ?? 0;
  const stepParamRaw = searchParams.get(STEP_QUERY_KEY);
  const stepParam = stepParamRaw !== null && /^\d+$/.test(stepParamRaw.trim()) ? Number(stepParamRaw.trim()) : null;
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
        preventScrollReset: true,
      });
      setActiveStepNumber(stepNumber);
      setCopyState('idle');
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

  // 활성 썸네일이 가로 목록 안에서 보이도록 목록 컨테이너만 수평 스크롤한다. 페이지 수직 스크롤은 건드리지 않는다.
  useEffect(() => {
    const button = thumbRefs.current[activeStepNumber - 1];
    const scroller = button?.parentElement?.parentElement;
    if (!(button instanceof HTMLElement) || !(scroller instanceof HTMLElement)) return;
    const gap = 8;
    const itemLeft = button.offsetLeft - scroller.offsetLeft - gap;
    const itemRight = button.offsetLeft - scroller.offsetLeft + button.offsetWidth + gap;
    const maxLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    if (itemLeft < scroller.scrollLeft) {
      scroller.scrollTo({ left: Math.max(0, Math.min(maxLeft, itemLeft)) });
    } else if (itemRight > scroller.scrollLeft + scroller.clientWidth) {
      scroller.scrollTo({
        left: Math.max(0, Math.min(maxLeft, itemRight - scroller.clientWidth)),
      });
    }
  }, [activeStepNumber, stepCount]);

  if (status === 'loading') {
    return (
      <div className="w-full py-8 md:py-12">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 md:px-6" aria-busy="true">
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
      </div>
    );
  }

  if (status === 'not-found') {
    notFound();
  }

  if (status === 'error' || detail === null) {
    return (
      <div className="w-full py-8 md:py-12">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 md:px-6">
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-2xl border border-dark-200 bg-surface-50 p-8 text-center"
          >
            <p className="text-sm font-semibold text-dark-900 break-words [word-break:keep-all]">
              플로를 불러오지 못했어요.
            </p>
            <Button
              type="button"
              variant="contained"
              color="primary"
              size="sm"
              onClick={() => retry()}
              className="active:scale-[0.98] motion-reduce:transform-none"
            >
              <RefreshCw size={16} className="shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">다시 시도</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const steps = detail.steps;
  const stepIndex = Math.min(activeStepNumber, stepCount) - 1;
  const activeStep = steps[stepIndex];
  const hasNextStep = stepIndex < stepCount - 1;
  const hasPrevStep = stepIndex > 0;
  const platformLabel = VISUAL_PLATFORM_LABELS[detail.platform] ?? detail.platform;
  const flowTypeLabel = VISUAL_FLOW_TYPE_LABELS[detail.flowType] ?? detail.flowType;

  const handleShare = async () => {
    try {
      if (
        typeof navigator === 'undefined' ||
        !navigator.clipboard ||
        typeof navigator.clipboard.writeText !== 'function'
      ) {
        throw new Error('clipboard unavailable');
      }
      await navigator.clipboard.writeText(window.location.href);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  return (
    <div className="w-full py-8 md:py-12">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 md:px-6">
        <nav aria-label="브레드크럼브">
          <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-dark-400">
            <li>
              <Link
                href="/flows"
                className="rounded underline-offset-4 hover:text-dark-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
              >
                플로
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="min-w-0 max-w-full truncate font-medium text-dark-700">
              {detail.title}
            </li>
          </ol>
        </nav>

        <header className="flex flex-col gap-3">
          <p className="flex min-w-0 items-center gap-2.5">
            {detail.product.logoUrl.length > 0 && (
              <img
                src={detail.product.logoUrl}
                alt={`${detail.product.name} 로고`}
                loading="lazy"
                onError={event => {
                  event.currentTarget.style.display = 'none';
                }}
                className="h-8 w-8 shrink-0 rounded-lg border border-dark-150 bg-white object-contain"
              />
            )}
            <Link
              href={`/flows?product=${encodeURIComponent(detail.product.slug)}`}
              className="min-w-0 truncate text-sm font-medium text-dark-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
            >
              {detail.product.name}
            </Link>
          </p>
          <h1 className="break-words [word-break:keep-all] text-2xl font-bold tracking-tight text-dark-900 md:text-3xl">
            {detail.title}
          </h1>
          {detail.description.length > 0 && (
            <p className="max-w-2xl text-sm leading-relaxed text-dark-500 break-words [word-break:keep-all]">
              {detail.description}
            </p>
          )}
          <ul className="flex flex-wrap items-center gap-1.5" aria-label="플로 정보">
            <li className="rounded-full border border-dark-150 bg-white px-2.5 py-1 text-xs text-dark-600">
              {platformLabel}
            </li>
            <li className="rounded-full border border-dark-150 bg-white px-2.5 py-1 text-xs text-dark-600">
              {flowTypeLabel}
            </li>
            <li className="rounded-full border border-dark-150 bg-white px-2.5 py-1 text-xs text-dark-600 tabular-nums">
              {stepCount}단계
            </li>
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <SaveButton
              item={{
                kind: 'flow',
                id: detail.id,
                title: detail.title,
                imageUrl: steps[0]?.screenshot.imageUrl ?? detail.product.logoUrl,
                href: `/flows/${encodeURIComponent(detail.id)}`,
                productName: detail.product.name,
              }}
            />
            <Button
              type="button"
              variant="shadow"
              color="primary"
              size="sm"
              onClick={handleShare}
              className="active:scale-[0.98] motion-reduce:transform-none"
            >
              <Link2 size={16} className="shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">링크 복사</span>
            </Button>
            <span aria-live="polite" className="text-xs text-dark-500">
              {copyState === 'copied'
                ? '링크를 복사했어요.'
                : copyState === 'error'
                  ? '링크 복사에 실패했어요. 주소창의 URL을 직접 복사해 주세요.'
                  : ''}
            </span>
          </div>
        </header>

        {stepCount === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-dark-200 py-16 text-center text-dark-500">
            <p className="text-base font-semibold text-dark-700">등록된 단계가 없습니다.</p>
            <p className="mt-1 text-sm text-dark-400">이 플로에는 아직 등록된 스텝(단계)이 없습니다.</p>
          </div>
        ) : (
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section
              aria-label="플로 단계 이미지"
              className="min-w-0 rounded-2xl border border-dark-150 bg-surface-50 p-3 md:p-4"
            >
              <div className="flex min-w-0 flex-col gap-3">
                {activeStep && (
                  <figure className="flex min-w-0 flex-col gap-2">
                    <StepImage src={activeStep.screenshot.imageUrl} alt={activeStep.screenshot.imageAlt} />
                  </figure>
                )}
                <nav aria-label="단계 썸네일" className="min-w-0">
                  <ul className="flex min-w-0 list-none gap-2 overflow-x-auto pb-1">
                    {steps.map((step, index) => {
                      const stepNumber = index + 1;
                      const isActive = index === stepIndex;
                      return (
                        <li key={step.screenshot.id} className="shrink-0">
                          <button
                            type="button"
                            ref={element => {
                              thumbRefs.current[index] = element;
                            }}
                            onClick={() => goToStep(stepNumber)}
                            aria-label={`단계 ${stepNumber}로 이동`}
                            aria-current={isActive ? 'step' : undefined}
                            className={`flex min-h-[44px] w-24 flex-col items-center gap-1 rounded-lg border bg-white p-1.5 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 motion-reduce:transform-none motion-reduce:transition-none ${
                              isActive ? 'border-dark-900' : 'border-dark-150 hover:border-dark-300'
                            }`}
                          >
                            <span
                              className={`text-2xs font-bold tabular-nums select-none ${isActive ? 'text-dark-900' : 'text-dark-400'}`}
                            >
                              {stepNumber}
                            </span>
                            <img
                              src={step.screenshot.imageUrl}
                              alt=""
                              aria-hidden="true"
                              loading="lazy"
                              className="h-14 w-full rounded bg-surface-100 object-contain object-top"
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </div>
            </section>

            <aside
              aria-label="단계 설명"
              className="flex min-w-0 flex-col gap-4 rounded-2xl border border-dark-150 bg-white p-4 md:p-5"
            >
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold tabular-nums text-dark-700" aria-live="polite">
                  단계 {activeStepNumber} / {stepCount}
                </p>
                <div
                  role="progressbar"
                  aria-label="플로 진행 상황"
                  aria-valuenow={activeStepNumber}
                  aria-valuemin={1}
                  aria-valuemax={stepCount}
                  className="h-1.5 w-full overflow-hidden rounded-full bg-surface-200"
                >
                  <div
                    className="h-full rounded-full bg-dark-900"
                    style={{
                      width: `${stepCount > 0 ? (activeStepNumber / stepCount) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              {activeStep && (
                <div className="flex min-w-0 flex-col gap-1 text-sm">
                  <span className="font-medium text-dark-800 break-words [word-break:keep-all]">
                    {activeStep.screenshot.title ?? activeStep.screenshot.imageAlt}
                  </span>
                  {activeStep.caption.length > 0 && (
                    <span className="leading-relaxed text-dark-600 break-words [word-break:keep-all]">
                      {activeStep.caption}
                    </span>
                  )}
                </div>
              )}
              <div className="mt-auto flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="shadow"
                  color="primary"
                  size="sm"
                  onClick={() => goToStep(activeStepNumber - 1)}
                  disabled={!hasPrevStep}
                  className="flex-1 active:scale-[0.98] motion-reduce:transform-none"
                >
                  <ChevronLeft size={16} className="shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">이전</span>
                  <span className="sr-only"> 단계</span>
                </Button>
                <Button
                  type="button"
                  variant="shadow"
                  color="primary"
                  size="sm"
                  onClick={() => goToStep(activeStepNumber + 1)}
                  disabled={!hasNextStep}
                  className="flex-1 active:scale-[0.98] motion-reduce:transform-none"
                >
                  <span className="whitespace-nowrap">다음</span>
                  <ChevronRight size={16} className="shrink-0" aria-hidden="true" />
                  <span className="sr-only"> 단계</span>
                </Button>
              </div>
              {activeStep && (
                <Link
                  href={`/screenshots/${encodeURIComponent(activeStep.screenshot.id)}`}
                  className="self-start rounded-lg text-sm font-semibold text-dark-500 transition-colors hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
                >
                  화면 상세 보기 →
                </Link>
              )}
            </aside>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            as="a"
            href={`/flows?product=${encodeURIComponent(detail.product.slug)}`}
            variant="contained"
            color="primary"
            size="md"
            className="active:scale-[0.98] motion-reduce:transform-none"
          >
            <span className="whitespace-nowrap">이 서비스의 플로</span>
          </Button>
          <Button
            as="a"
            href={`https://darun.io/ko/products/${encodeURIComponent(detail.product.slug)}`}
            target="_blank"
            rel="noopener noreferrer"
            variant="shadow"
            color="primary"
            size="md"
            className="active:scale-[0.98] motion-reduce:transform-none"
          >
            <ExternalLink size={16} className="shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">서비스 소개</span>
          </Button>
          <Button
            type="button"
            variant="text"
            color="primary"
            size="md"
            onClick={() => router.back()}
            className="sm:ml-auto active:scale-[0.98] motion-reduce:transform-none"
          >
            <span className="whitespace-nowrap">뒤로 가기</span>
          </Button>
        </div>

        {detail.relatedFlows.length > 0 && (
          <section aria-labelledby="flow-related-heading" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="flow-related-heading" className="text-lg font-bold text-dark-900">
                같은 앱의 다른 플로 ({detail.relatedFlowTotalCount})
              </h2>
              <Link
                href={`/apps/${encodeURIComponent(detail.product.slug)}`}
                className="shrink-0 rounded-lg text-sm font-semibold text-dark-500 transition-colors hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
              >
                전체 보기 →
              </Link>
            </div>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {detail.relatedFlows.map(flow => (
                <li key={flow.id}>
                  <Link
                    href={`/flows/${encodeURIComponent(flow.id)}`}
                    className="group block overflow-hidden rounded-2xl border border-dark-150 bg-white shadow-2xs transition hover:border-dark-300 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
                  >
                    <div className="aspect-[16/9] w-full overflow-hidden bg-surface-100">
                      <img
                        src={flow.coverImageUrl}
                        alt={flow.coverImageAlt || flow.title || `${detail.product.name} 플로 커버`}
                        loading={VISUAL_CARD_IMAGE_LOADING}
                        className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3.5">
                      <span className="truncate text-sm font-bold text-dark-900">{flow.title}</span>
                      <span className="shrink-0 text-xs text-dark-500 tabular-nums">{flow.stepCount}단계</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

export const FlowDetail = bind((props: { id: string }) => ({ ...useFlowDetail(props.id) }), View, {
  displayName: 'FlowDetail',
});
