'use client';

import { Button, Layers } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { VISUAL_CARD_IMAGE_LOADING } from '../perf/imageLoading';
import type { FlowCard } from '../flows/useFlowExplorer';
import { VISUAL_FLOW_TYPE_LABELS } from '../flows/flowClassifications';
import { VISUAL_PLATFORM_LABELS } from '../screenshots/visualClassifications';
import type { ScreenshotCard } from '../screenshots/useScreenshotExplorer';
import {
  UNCLASSIFIED_LABEL,
  VISUAL_PLATFORM_LABELS as SCREENSHOT_PLATFORM_LABELS,
  VISUAL_SCREEN_TYPE_LABELS,
  isVisualPlatformValue,
  isVisualScreenTypeValue,
} from '../screenshots/visualClassifications';
import { useSavesPage, type SavesTab } from './useSavesPage';

const TABS: Array<{ value: SavesTab; label: string }> = [
  { value: 'screenshots', label: '화면' },
  { value: 'flows', label: '플로우' },
];

function SavedScreenshotCardGrid({ cards }: { cards: ScreenshotCard[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(card => (
        <li key={card.id}>
          <Link
            href={`/screenshots/${encodeURIComponent(card.id)}`}
            className="group block overflow-hidden rounded-2xl border border-dark-150 bg-white shadow-2xs transition hover:border-dark-300 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-surface-100">
              <img
                src={card.imageUrl}
                alt={
                  card.imageAlt ||
                  card.title ||
                  (card.product.name ? `${card.product.name} 스크린샷` : '스크린샷 이미지')
                }
                loading={VISUAL_CARD_IMAGE_LOADING}
                className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
              />
            </div>
            <div className="flex flex-col gap-1 p-3.5">
              <span className="truncate text-sm font-bold text-dark-900">{card.title ?? card.imageAlt}</span>
              <span className="flex items-center gap-2 text-xs text-dark-500">
                <span className="truncate">{card.product.name}</span>
                <span aria-hidden="true" className="text-dark-300">
                  ·
                </span>
                <span className="shrink-0">
                  {card.platform && isVisualPlatformValue(card.platform)
                    ? SCREENSHOT_PLATFORM_LABELS[card.platform]
                    : UNCLASSIFIED_LABEL}
                </span>
                <span aria-hidden="true" className="text-dark-300">
                  ·
                </span>
                <span className="shrink-0">
                  {card.screenType && isVisualScreenTypeValue(card.screenType)
                    ? VISUAL_SCREEN_TYPE_LABELS[card.screenType]
                    : UNCLASSIFIED_LABEL}
                </span>
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SavedFlowCardGrid({ cards }: { cards: FlowCard[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(card => (
        <li key={card.id}>
          <Link
            href={`/flows/${encodeURIComponent(card.id)}`}
            className="group block overflow-hidden rounded-2xl border border-dark-150 bg-white shadow-2xs transition hover:border-dark-300 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-surface-100">
              <img
                src={card.coverImageUrl}
                alt={card.coverImageAlt || (card.title ? `${card.title} 플로 커버 이미지` : '플로 커버 이미지')}
                loading={VISUAL_CARD_IMAGE_LOADING}
                className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
              />
            </div>
            <div className="flex flex-col gap-1 p-3.5">
              <span className="flex items-center gap-1.5 truncate text-sm font-bold text-dark-900">
                <Layers size={14} className="shrink-0 text-dark-400" aria-hidden="true" />
                {card.title}
              </span>
              <span className="flex items-center gap-2 text-xs text-dark-500">
                <span className="truncate">{card.product.name}</span>
                <span aria-hidden="true" className="text-dark-300">
                  ·
                </span>
                <span className="shrink-0">{VISUAL_PLATFORM_LABELS[card.platform] ?? card.platform}</span>
                <span aria-hidden="true" className="text-dark-300">
                  ·
                </span>
                <span className="shrink-0">{VISUAL_FLOW_TYPE_LABELS[card.flowType] ?? card.flowType}</span>
              </span>
              <span className="text-xs text-dark-400 tabular-nums">{card.stepCount}단계</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SavesSkeletons() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="overflow-hidden rounded-2xl border border-dark-150 bg-white">
          <div className="aspect-[4/3] w-full animate-pulse bg-surface-200 motion-reduce:animate-none" />
          <div className="flex flex-col gap-2 p-3.5">
            <div className="h-4 w-3/4 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * M4 내 저장 페이지. 로그인 필수 — 미인증 시 로그인 안내.
 * 탭별 화면/플로 저장 카드 목록, 저장 시각 내림차순, 더보기 페이징.
 */
export function SavesExplorer() {
  const state = useSavesPage();

  if (state.status === 'loading') {
    return (
      <div className="flex w-full flex-col gap-6 md:gap-10">
        <SavesSkeletons />
        <span className="sr-only">저장한 화면을 불러오는 중</span>
      </div>
    );
  }

  if (state.status === 'login-required') {
    return (
      <div className="flex w-full flex-col items-center gap-3 py-16 text-center">
        <p className="text-lg font-bold text-dark-900">저장은 로그인 후 이용할 수 있어요.</p>
        <p className="text-sm text-dark-500">로그인하면 저장한 화면과 플로우를 여기서 모아볼 수 있어요.</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div role="alert" className="flex w-full flex-col items-center gap-3 py-16 text-center">
        <p className="text-lg font-bold text-dark-900">저장 목록을 불러오지 못했어요.</p>
        <Button type="button" variant="shadow" size="sm" onClick={state.retry}>
          다시 시도
        </Button>
      </div>
    );
  }

  const cards = state.tab === 'screenshots' ? state.screenshotCards : state.flowCards;
  const totalCount = state.tab === 'screenshots' ? state.screenshotTotalCount : state.flowTotalCount;
  const emptyLabel = state.tab === 'screenshots' ? '저장한 화면이 없어요.' : '저장한 플로우가 없어요.';

  return (
    <div className="flex w-full flex-col gap-6 md:gap-10">
      <div role="tablist" aria-label="저장 목록" className="flex gap-2">
        {TABS.map(tab => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={state.tab === tab.value}
            type="button"
            onClick={() => state.onTabChange(tab.value)}
            className={
              state.tab === tab.value
                ? 'rounded-full bg-dark-900 px-4 py-2 text-sm font-bold text-white'
                : 'rounded-full border border-dark-150 bg-white px-4 py-2 text-sm font-semibold text-dark-600'
            }
          >
            {tab.label}
            <span className="ml-1 tabular-nums">
              ({tab.value === 'screenshots' ? state.screenshotTotalCount : state.flowTotalCount})
            </span>
          </button>
        ))}
      </div>

      {totalCount === 0 ? (
        <div className="flex w-full flex-col items-center gap-2 py-16 text-center">
          <p className="text-base font-bold text-dark-900">{emptyLabel}</p>
          <p className="text-sm text-dark-500">마음에 드는 화면이나 플로우를 저장해 보세요.</p>
        </div>
      ) : (
        <>
          {state.tab === 'screenshots' ? (
            <SavedScreenshotCardGrid cards={state.screenshotCards} />
          ) : (
            <SavedFlowCardGrid cards={state.flowCards} />
          )}
          {state.hasNextPage && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="shadow"
                size="md"
                onClick={state.onLoadMore}
                disabled={state.loadingMore}
              >
                {state.loadingMore ? '불러오는 중…' : '더 보기'}
              </Button>
            </div>
          )}
          {state.loadMoreError && (
            <div role="alert" className="flex justify-center">
              <Button type="button" variant="shadow" size="sm" onClick={state.retryLoadMore}>
                더 보기 다시 시도
              </Button>
            </div>
          )}
          <span className="sr-only" aria-live="polite">
            {cards.length}개 표시됨
          </span>
        </>
      )}
    </div>
  );
}
