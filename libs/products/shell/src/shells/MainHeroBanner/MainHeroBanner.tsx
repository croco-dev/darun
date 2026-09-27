'use client';

import { ChevronRight, ContentArea, Search } from '@darun/ui';
import { Link } from '@darun/utils-router';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

type MainHeroBannerProps = { productsCount?: number };

const POPULAR_SEARCH_TAGS: Record<string, string[]> = {
  ko: ['노션', '피그마', '슬랙', 'Linear', 'ChatGPT', 'Supabase'],
  en: ['Notion', 'Figma', 'Slack', 'Linear', 'ChatGPT', 'Supabase'],
};

export const MainHeroBanner = ({ productsCount }: MainHeroBannerProps) => {
  const t = useTranslations();
  const locale = useLocale();
  const popularSearchTags = POPULAR_SEARCH_TAGS[locale] ?? POPULAR_SEARCH_TAGS.ko;
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

      <ContentArea className="relative z-10 py-14 sm:py-16 md:py-20">
        <div className="flex max-w-2xl flex-col gap-5 md:gap-6">
          {/* Badge Pill */}
          <Link
            href={popularPath}
            className="group inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3.5 py-1.5 backdrop-blur-md shadow-xs transition-all duration-200 active:scale-[0.98] motion-reduce:transform-none hover:border-white/25 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-900"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold tracking-tight text-white/90 sm:text-sm">
              {t('Main.hero.badge')}
            </span>
            <ChevronRight
              size={14}
              className="text-white/60 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>

          <div className="flex flex-col gap-2 sm:gap-2.5">
            <span className="text-xs font-semibold tracking-tight text-brown-400 sm:text-sm">
              {t('Main.hero.description')}
            </span>
            <h1 className="text-3xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-4xl md:text-5xl">
              <span className="tabular-nums">{productsCount?.toLocaleString(locale) ?? 0}</span>
              {t('Main.hero.title.countSuffix')}{' '}
              <span className="bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-300 bg-clip-text text-transparent">
                {t('Main.hero.title.highlight')}
              </span>{' '}
              <span>{t('Main.hero.title.ending')}</span>
            </h1>
          </div>

          <p className="max-w-xl text-sm leading-relaxed text-dark-300 break-keep sm:text-base">
            {t('Main.hero.subDescription')}
          </p>

          {/* Quick Search Recommendation Tags */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-medium text-dark-400 sm:text-sm">{t('Main.hero.popularSearch')}</span>
            {popularSearchTags.map(keyword => (
              <Link
                key={keyword}
                href={`/${locale}/search/product?query=${encodeURIComponent(keyword)}`}
                className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80 backdrop-blur-xs transition-all duration-150 active:scale-[0.98] motion-reduce:transform-none hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-900"
              >
                <Search size={11} className="shrink-0 text-white/40 transition-colors group-hover:text-white/80" />
                <span>{keyword}</span>
              </Link>
            ))}
          </div>
        </div>
      </ContentArea>
      <div className="border-b border-white/10" />
    </section>
  );
};
