'use client';

import { Link } from '@darun/utils-router';
import { VISUAL_SCREEN_TYPE_LABELS } from '../screenshots/visualClassifications';

const CATEGORY_ORDER = [
  'ONBOARDING',
  'SIGN_IN',
  'SIGN_UP',
  'SEARCH',
  'CHECKOUT',
  'SETTINGS',
  'HOME',
  'DETAIL',
] as const;

export type VisualHomeCategory = (typeof CATEGORY_ORDER)[number];

export function buildCategoryHref(screenType: VisualHomeCategory) {
  return `/?screenType=${screenType}`;
}

export function VisualHomeHero() {
  return (
    <section aria-labelledby="visual-home-hero-title" className="w-full">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="flex max-w-2xl flex-col gap-2 md:gap-3">
          <h1
            id="visual-home-hero-title"
            className="text-2xl font-bold tracking-tight text-dark-900 break-words [word-break:keep-all] sm:text-3xl md:text-4xl"
          >
            좋은 제품의 실제 화면을 탐색하세요.
          </h1>
          <p className="text-sm leading-relaxed text-dark-500 break-words [word-break:keep-all] sm:text-base">
            다른 Visual은 전 세계의 훌륭한 제품들이 만들어가는 경험을 실제 화면으로 수집하고 정리합니다.
          </p>
        </div>
      </div>
    </section>
  );
}

export function CategoryCards() {
  return (
    <nav aria-label="화면 유형별 탐색" className="flex w-full flex-wrap items-center gap-1.5 sm:gap-2">
      <span className="text-xs font-semibold text-dark-500 whitespace-nowrap">유형:</span>
      <ul className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {CATEGORY_ORDER.map(screenType => (
          <li key={screenType}>
            <Link
              href={buildCategoryHref(screenType)}
              className="inline-flex items-center rounded-full border border-dark-150 bg-white px-3 py-1 text-xs font-medium text-dark-700 shadow-2xs transition hover:border-dark-300 hover:bg-surface-50 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
            >
              {VISUAL_SCREEN_TYPE_LABELS[screenType]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
