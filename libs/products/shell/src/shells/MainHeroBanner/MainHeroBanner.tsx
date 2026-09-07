'use client';

import { ChevronRight, ContentArea } from '@darun/ui';
import { Link } from '@darun/utils-router';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

type MainHeroBannerProps = { productsCount?: number };

const POPULAR_SEARCH_TAGS = ['Notion', 'Figma', 'Slack', 'Linear', 'ChatGPT', 'Supabase'];

export const MainHeroBanner = ({ productsCount }: MainHeroBannerProps) => {
  const t = useTranslations();
  const locale = useLocale();
  const isKo = locale === 'ko';
  const popularPath = `/${locale}/ranking`;

  return (
    <section data-testid="home-hero" className="relative isolate overflow-hidden bg-dark-900">
      {/* Ambient background glow and grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_-15%,rgba(217,144,73,0.18),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff0d_1px,transparent_1px)] [background-size:24px_24px] opacity-70"
      />
      <Image
        src="/images/main-hero-banner.png"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="pointer-events-none object-contain object-right opacity-15 mix-blend-overlay"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-dark-900 via-dark-900/90 to-transparent" />

      <ContentArea className="relative z-10 py-14 sm:py-18 md:py-22">
        <div className="flex max-w-2xl flex-col gap-5 md:gap-6">
          {/* Badge Pill */}
          <Link
            href={popularPath}
            className="group inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3.5 py-1.5 backdrop-blur-md shadow-xs transition-all duration-200 hover:border-white/25 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brown-400 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brown-500" />
            </span>
            <span className="text-xs font-semibold tracking-tight text-white/90 sm:text-sm">
              {isKo ? '실시간 소프트웨어 비교 & 디스커버리' : 'Curated Software Discovery & Comparison'}
            </span>
            <ChevronRight
              size={14}
              className="text-white/60 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium tracking-tight text-dark-300 md:text-base">
              {t('Main.hero.description')}
            </span>
            <h1 className="text-3xl font-extrabold leading-[1.12] tracking-tightest text-white sm:text-4xl md:text-5xl lg:text-[52px]">
              {productsCount?.toLocaleString(locale) ?? 0}
              {t('Main.hero.title.countSuffix')}{' '}
              <span className="bg-gradient-to-r from-brown-400 via-amber-300 to-brown-500 bg-clip-text text-transparent drop-shadow-glow-subtle">
                {t('Main.hero.title.highlight')}
              </span>{' '}
              <span>{t('Main.hero.title.ending')}</span>
            </h1>
          </div>

          <p className="max-w-xl text-sm leading-relaxed text-dark-300 sm:text-base">
            {isKo
              ? '팀과 개인의 생산성을 극대화할 최적의 도구를 나란히 비교하고, 실제 커뮤니티 추천 랭킹으로 검증된 서비스를 찾아보세요.'
              : 'Discover and compare verified digital tools side-by-side with real community ratings to find what fits your needs.'}
          </p>

          {/* Quick Search Recommendation Tags */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-medium text-dark-400 sm:text-sm">{isKo ? '인기 탐색:' : 'Popular:'}</span>
            {POPULAR_SEARCH_TAGS.map(keyword => (
              <Link
                key={keyword}
                href={`/${locale}/search/product?query=${encodeURIComponent(keyword)}`}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 transition-all duration-200 hover:border-brown-400/50 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brown-400/60"
              >
                {keyword}
              </Link>
            ))}
          </div>
        </div>
      </ContentArea>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
};
