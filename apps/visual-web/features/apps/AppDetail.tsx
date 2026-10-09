'use client';

import { Button, ImageOff, RefreshCw } from '@darun/ui';
import { Link, notFound, useRouter } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
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
  const { status, detail, retry, slug } = props;
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
          className="active:scale-[0.98] motion-reduce:transform-none"
        >
          <RefreshCw size={16} className="shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap">다시 시도</span>
        </Button>
      </div>
    );
  }

  const screenshotsHref = `/?product=${encodeURIComponent(detail.slug)}`;
  const flowsHref = `/flows?product=${encodeURIComponent(detail.slug)}`;

  return (
    <div className="flex w-full flex-col gap-6 md:gap-10">
      <button
        type="button"
        onClick={() => router.back()}
        className="self-start rounded-lg text-sm font-semibold text-dark-500 transition-colors hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
      >
        ← 뒤로 가기
      </button>
      <header className="flex items-center gap-4">
        <img
          src={detail.logoUrl || DEFAULT_ICON}
          alt={`${detail.name} 로고`}
          className="h-16 w-16 shrink-0 rounded-2xl border border-dark-150 bg-surface-100 object-cover"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-2xl font-bold tracking-tight text-dark-900 md:text-3xl">{detail.name}</h1>
          {detail.summary.trim().length > 0 && (
            <p className="line-clamp-2 text-sm leading-relaxed text-dark-500">{detail.summary}</p>
          )}
        </div>
      </header>

      <section aria-labelledby="app-screenshots-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="app-screenshots-heading" className="text-lg font-bold text-dark-900">
            화면 모음 ({detail.screenshotTotalCount})
          </h2>
          <Link
            href={screenshotsHref}
            className="shrink-0 rounded-lg text-sm font-semibold text-dark-500 transition-colors hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
          >
            전체 보기 →
          </Link>
        </div>
        {detail.screenshots.length === 0 ? (
          <p className="rounded-2xl border border-dark-200 bg-surface-50 p-6 text-center text-sm text-dark-500">
            등록된 화면이 없습니다.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {detail.screenshots.map(item => (
              <li key={item.id}>
                <Link
                  href={`/screenshots/${encodeURIComponent(item.id)}`}
                  className="group block overflow-hidden rounded-2xl border border-dark-150 bg-white shadow-2xs transition hover:border-dark-300 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-surface-100">
                    <img
                      src={item.imageUrl}
                      alt={item.imageAlt || item.title || `${detail.name} 스크린샷`}
                      loading="lazy"
                      className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
                    />
                  </div>
                  {item.title && <div className="truncate p-2.5 text-xs font-semibold text-dark-900">{item.title}</div>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="app-flows-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="app-flows-heading" className="text-lg font-bold text-dark-900">
            플로 모음 ({detail.flowTotalCount})
          </h2>
          <Link
            href={flowsHref}
            className="shrink-0 rounded-lg text-sm font-semibold text-dark-500 transition-colors hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
          >
            전체 보기 →
          </Link>
        </div>
        {detail.flows.length === 0 ? (
          <p className="rounded-2xl border border-dark-200 bg-surface-50 p-6 text-center text-sm text-dark-500">
            등록된 플로가 없습니다.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {detail.flows.map(flow => (
              <li key={flow.id}>
                <Link
                  href={`/flows/${encodeURIComponent(flow.id)}`}
                  className="group block overflow-hidden rounded-2xl border border-dark-150 bg-white shadow-2xs transition hover:border-dark-300 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
                >
                  <div className="aspect-[16/9] w-full overflow-hidden bg-surface-100">
                    <img
                      src={flow.coverImageUrl}
                      alt={flow.coverImageAlt || flow.title || `${detail.name} 플로 커버`}
                      loading="lazy"
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
        )}
      </section>
      <span className="sr-only">{slug}</span>
    </div>
  );
};

const BoundAppDetail = bind<{ slug: string }, AppDetailState & { slug: string }>(
  props => ({ ...useAppDetail(props.slug), slug: props.slug }),
  View,
  { displayName: 'AppDetail' }
);

export function AppDetail({ slug }: { slug: string }) {
  return <BoundAppDetail slug={slug} />;
}
