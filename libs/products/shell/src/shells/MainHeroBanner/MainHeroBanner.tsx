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
    <section data-testid="home-hero" className="relative isolate overflow-hidden border-b border-dark-800 bg-dark-900">
      <Image
        src="/images/main-hero-banner.png"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="pointer-events-none object-contain object-right opacity-25"
      />
      <ContentArea className="relative z-10 py-14 md:py-20">
        <div className="flex flex-col gap-6 md:max-w-2xl">
          <span className="text-sm font-medium tracking-tight text-dark-300 md:text-base">
            {t('Main.hero.description')}
          </span>
          <h1 className="text-3xl font-bold leading-tight tracking-tightest text-dark-000 sm:text-4xl md:text-5xl">
            {productsCount ?? 0}
            {t('Main.hero.title.countSuffix')} <span className="text-brown-600">{t('Main.hero.title.highlight')}</span>{' '}
            {t('Main.hero.title.ending')}
          </h1>
          <Link
            href={popularPath}
            className="text-sm font-semibold text-dark-100 underline underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:transition-none md:text-base"
          >
            {t('home.hero.cta.popular')}
          </Link>
        </div>
      </ContentArea>
    </section>
  );
};
