'use client';

import { Button, ImageOff, RefreshCw } from '@darun/ui';
import { Link, notFound, useRouter } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { VISUAL_CARD_IMAGE_LOADING } from '../perf/imageLoading';
import { SaveButton } from '../collections/SaveButton';
import { AppDescription } from './AppDescription';
import { AppDetailState, useAppDetail } from './useAppDetail';

const DEFAULT_ICON = '/images/default-product-icon.svg';

function DetailSkeletons() {
  return (
    <div className="flex w-full flex-col gap-6 md:gap-10" aria-busy="true">
      <div className="h-8 w-2/3 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" aria-hidden="true" />
      <div
        className="min-h-72 w-full animate-pulse rounded-2xl bg-surface-200 motion-reduce:animate-none"
        aria-hidden="true"
      />
      <span className="sr-only">앱을 불러오는 중</span>
    </div>
  );
}

const View = (props: AppDetailState & { slug: string }) => {
  const { status, detail, retry } = props;
  const router = useRouter();

  if (status === 'loading') {
    return <DetailSkeletons />;
  }

  if (status === 'not-found') {
    notFound();
    return null;
  }

  if (status === 'error' || detail === null) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-2xl border border-dark-200 bg-surface-50 p-8 text-center"
      >
        <ImageOff size={28} className="shrink-0 text-dark-400" aria-hidden="true" />
        <p className="text-sm font-semibold text-dark-900 break-words [word-break:keep-all]">앱을 불러오지 못했어요.</p>
        <Button
          type="button"
          variant="contained"
          color="primary"
          size="sm"
          onClick={() => retry()}
          className="min-h-[44px] active:scale-[0.98] motion-reduce:transform-none"
        >
          <RefreshCw size={16} className="shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap">다시 시도</span>
        </Button>
      </div>
    );
  }

  const screenshotsHref = `/?product=${encodeURIComponent(detail.slug)}`;
  const flowsHref = `/flows?product=${encodeURIComponent(detail.slug)}`;
  const appHref = `/apps/${encodeURIComponent(detail.slug)}`;

  return (
    <div className="flex w-full flex-col gap-6 md:gap-10">
      <nav
        aria-label="이동 경로"
        className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-dark-600"
      >
        <Link
          href="/apps"
          className="inline-flex min-h-[44px] shrink-0 items-center rounded font-semibold transition-colors hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
        >
          앱
        </Link>
        <span aria-hidden="true" className="text-dark-300">
          /
        </span>
        <span aria-current="page" className="min-w-0 flex-1 truncate font-semibold text-dark-900">
          {detail.name}
        </span>
      </nav>
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex min-h-[44px] items-center self-start rounded-lg text-sm font-semibold text-dark-600 transition-colors hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
      >
        ← 뒤로 가기
      </button>
      <header className="flex items-center gap-4">
        <img
          src={detail.logoUrl || DEFAULT_ICON}
          alt={`${detail.name} 로고`}
          className="h-16 w-16 shrink-0 rounded-2xl border border-dark-150 bg-surface-100 object-cover md:h-20 md:w-20"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="break-words text-[28px] font-bold leading-tight tracking-tight text-dark-900 [word-break:keep-all] md:text-[32px]">
            {detail.name}
          </h1>
          {detail.summary.trim().length > 0 && (
            <p className="line-clamp-2 text-sm leading-relaxed text-dark-600">{detail.summary}</p>
          )}
        </div>
        <SaveButton
          item={{
            kind: 'app',
            id: detail.id,
            title: detail.name,
            imageUrl: detail.logoUrl || DEFAULT_ICON,
            href: appHref,
            productName: detail.name,
          }}
        />
      </header>
      {detail.description !== null && detail.description.trim().length > 0 && (
        <div className="border-t border-dark-100 pt-6 md:pt-8">
          <AppDescription description={detail.description} />
        </div>
      )}

      <section
        aria-labelledby="app-screenshots-heading"
        className="flex flex-col gap-4 border-t border-dark-100 pt-6 md:pt-8"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="app-screenshots-heading" className="text-lg font-bold text-dark-900">
            화면 모음 ({detail.screenshotTotalCount})
          </h2>
          <Link
            href={screenshotsHref}
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-lg text-sm font-semibold text-dark-600 transition-colors hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
          >
            전체 보기 →
          </Link>
        </div>
        {detail.screenshots.length === 0 ? (
          <p className="rounded-2xl border border-dark-200 bg-surface-50 p-6 text-center text-sm text-dark-600">
            등록된 화면이 없습니다.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 xl:grid-cols-5">
            {detail.screenshots.map(item => (
              <li key={item.id} className="min-w-0">
                <Link
                  href={`/screenshots/${encodeURIComponent(item.id)}`}
                  className="group block overflow-hidden rounded-xl border border-dark-150 bg-white transition hover:border-dark-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
                >
                  <div className="flex h-48 items-center justify-center bg-surface-100 md:h-56">
                    <img
                      src={item.imageUrl}
                      alt={item.imageAlt || item.title || `${detail.name} 스크린샷`}
                      loading={VISUAL_CARD_IMAGE_LOADING}
                      className="max-h-full w-auto max-w-full object-contain"
                    />
                  </div>
                  {item.title && <div className="truncate p-2.5 text-xs font-semibold text-dark-900">{item.title}</div>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="app-flows-heading"
        className="flex flex-col gap-4 border-t border-dark-100 pt-6 md:pt-8"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="app-flows-heading" className="text-lg font-bold text-dark-900">
            플로 모음 ({detail.flowTotalCount})
          </h2>
          <Link
            href={flowsHref}
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-lg text-sm font-semibold text-dark-600 transition-colors hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
          >
            전체 보기 →
          </Link>
        </div>
        {detail.flows.length === 0 ? (
          <p className="rounded-2xl border border-dark-200 bg-surface-50 p-6 text-center text-sm text-dark-600">
            등록된 플로가 없습니다.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
            {detail.flows.map(flow => (
              <li key={flow.id} className="min-w-0">
                <Link
                  href={`/flows/${encodeURIComponent(flow.id)}`}
                  className="group block overflow-hidden rounded-xl border border-dark-150 bg-white transition hover:border-dark-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
                >
                  <div className="aspect-[16/9] w-full overflow-hidden bg-surface-100">
                    <img
                      src={flow.coverImageUrl}
                      alt={flow.coverImageAlt || flow.title || `${detail.name} 플로 커버`}
                      loading={VISUAL_CARD_IMAGE_LOADING}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3.5">
                    <span className="truncate text-sm font-bold text-dark-900">{flow.title}</span>
                    <span className="shrink-0 text-xs text-dark-600 tabular-nums">{flow.stepCount}단계</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

const BoundAppDetail = bind<{ slug: string }, AppDetailState & { slug: string }>(
  props => ({ ...useAppDetail(props.slug), slug: props.slug }),
  View,
  {
    displayName: 'AppDetail',
  }
);

export function AppDetail({ slug }: { slug: string }) {
  return <BoundAppDetail slug={slug} />;
}
