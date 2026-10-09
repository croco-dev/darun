'use client';

import { Link, useRouter } from '@darun/utils-router';
import { FormEvent, useCallback } from 'react';
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
  const router = useRouter();

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const rawQuery = formData.get('q');
      const query = typeof rawQuery === 'string' ? rawQuery.trim() : '';
      const params = new URLSearchParams();
      if (query.length > 0) {
        params.set('q', query);
      }
      const queryString = params.toString();
      router.push(queryString.length > 0 ? `/?${queryString}` : '/');
    },
    [router]
  );

  return (
    <section aria-labelledby="visual-home-hero-title" className="w-full">
      <div className="flex flex-col gap-4 rounded-3xl border border-dark-150 bg-surface-50 p-6 md:p-8">
        <h1
          id="visual-home-hero-title"
          className="text-2xl font-bold tracking-tight text-dark-900 break-words [word-break:keep-all] md:text-3xl"
        >
          한국 서비스의 화면과 흐름을 모아보세요
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-dark-500 break-words [word-break:keep-all] md:text-base">
          다른 팀이 손수 등록한 실제 화면으로 디자인과 UX를 탐색하세요.
        </p>
        <form onSubmit={handleSubmit} role="search" className="flex w-full max-w-xl gap-2">
          <label htmlFor="visual-home-search" className="sr-only">
            화면 검색
          </label>
          <input
            id="visual-home-search"
            name="q"
            type="search"
            autoComplete="off"
            maxLength={100}
            placeholder="서비스명, 화면 제목으로 검색"
            className="min-h-[44px] w-full rounded-xl border border-dark-150 bg-white px-3.5 py-2.5 text-sm text-dark-900 shadow-2xs placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-dark-900/60"
          />
          <button
            type="submit"
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-dark-900 px-4 text-sm font-semibold whitespace-nowrap text-white transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
          >
            검색
          </button>
        </form>
      </div>
    </section>
  );
}

export function CategoryCards() {
  return (
    <section aria-labelledby="visual-home-categories-title" className="flex w-full flex-col gap-3">
      <h2 id="visual-home-categories-title" className="text-base font-bold text-dark-900 md:text-lg">
        화면 유형으로 둘러보기
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CATEGORY_ORDER.map(screenType => (
          <li key={screenType}>
            <Link
              href={buildCategoryHref(screenType)}
              className="block rounded-2xl border border-dark-150 bg-white p-4 shadow-2xs transition hover:border-dark-300 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
            >
              <span className="block text-sm font-bold text-dark-900">{VISUAL_SCREEN_TYPE_LABELS[screenType]}</span>
              <span className="mt-1 block text-xs text-dark-500">화면 모음 보기</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
