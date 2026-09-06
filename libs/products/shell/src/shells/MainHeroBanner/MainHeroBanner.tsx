'use client';

import { ContentArea } from '@darun/ui';
import { Link } from '@darun/utils-router';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

type MainHeroBannerProps = { productsCount?: number };

export const MainHeroBanner = ({ productsCount }: MainHeroBannerProps) => {
  const t = useTranslations();
  const locale = useLocale();
  const popularPath = `/${locale}/ranking`;

  return (
    <section data-testid="home-hero" className="relative isolate overflow-hidden bg-dark-900">
      <Image
        src="/images/main-hero-banner.png"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="pointer-events-none object-contain object-right opacity-20 mix-blend-overlay"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-dark-900 via-dark-900/95 to-dark-900/70" />

      <ContentArea className="relative z-10 py-16 md:py-24">
        <div className="flex max-w-2xl flex-col gap-5 md:gap-6">
          <span className="text-sm font-medium tracking-tight text-dark-300 md:text-base">
            {t('Main.hero.description')}
          </span>
          <h1 className="text-3xl font-bold leading-[1.15] tracking-tightest text-white sm:text-4xl md:text-5xl">
            {productsCount?.toLocaleString(locale) ?? 0}
            {t('Main.hero.title.countSuffix')}{' '}
            <span className="text-brown-500 drop-shadow-glow-subtle">{t('Main.hero.title.highlight')}</span>{' '}
            <Link
              href={popularPath}
              className="text-white underline decoration-dark-400 underline-offset-[6px] transition-colors duration-200 hover:decoration-brown-500 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:transition-none"
            >
              {t('Main.hero.title.ending')}
            </Link>
          </h1>
        </div>
      </ContentArea>
    </section>
  );
};
