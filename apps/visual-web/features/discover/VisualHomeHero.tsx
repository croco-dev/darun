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
      <div className="flex min-w-0 flex-col gap-2">
        <h1
          id="visual-home-hero-title"
          className="min-w-0 text-2xl font-bold leading-tight tracking-tight text-dark-900 [overflow-wrap:anywhere] sm:text-3xl"
        >
          좋은 화면에서 시작하는 다음 디자인.
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-dark-600 break-words [word-break:keep-all]">
          실제 서비스의 화면과 흐름을 살펴보고, 다음 작업에 필요한 레퍼런스를 모아보세요.
        </p>
      </div>
    </section>
  );
}

export function CategoryCards() {
  return (
    <nav aria-label="화면 유형별 탐색" className="w-full overflow-x-auto">
      <ul className="flex w-max min-w-full items-center gap-2">
        {CATEGORY_ORDER.map(screenType => (
          <li key={screenType}>
            <Link
              href={buildCategoryHref(screenType)}
              className="inline-flex min-h-11 items-center rounded-lg bg-surface-100 px-3 text-xs font-medium text-dark-700 transition-colors duration-150 hover:bg-surface-200 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
            >
              {VISUAL_SCREEN_TYPE_LABELS[screenType]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
